import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';

import { getDueReviewBubbles, REVIEW_COMPLETED_EVENT, type ReviewCompletedEventDetail } from '../api/review';
import type { ReviewBubbleWordDto } from '../../shared/types';

const MAX_BUBBLES = 20;
const MAX_BUBBLES_PER_SIDE = 10;
const POP_DURATION_MS = 620;
const TAG_X_PATTERN = [4, 16, 7, 25, 12, 30, 5, 22, 9, 18];
const TAG_TOP_PATTERN = [7.4, 16.3, 26.2, 36.8, 47.6, 57.2, 67.4, 76.6, 85.4, 91.2];
const TAG_WIDTH_PATTERN = [5.05, 5.35, 5.65, 4.95, 5.85, 5.1, 5.55, 5, 5.75, 5.25];
const TAG_TILT_PATTERN = [-18, 14, -11, 19, -7, 16, -20, 9, -15, 12];
const TAG_SCALE_PATTERN = [0.92, 1.04, 0.88, 0.98, 1.08, 0.9, 1, 0.86, 0.95, 1.02];
const TAG_OPACITY_PATTERN = [0.60, 0.50, 0.56, 0.46, 0.62, 0.52, 0.58, 0.44, 0.54, 0.48];
const TAG_BLUR_PATTERN = [0, 0.2, 0, 0.4, 0, 0.3, 0.1, 0.55, 0.2, 0.45];

const DECORATIVE_BUBBLES = [
  { side: 'left', x: 2.8, top: 6.2, size: 2.5, tilt: -18, radius: '58% 42% 54% 46%', opacity: 0.58, duration: 10.5, delay: -1.2 },
  { side: 'left', x: 9.4, top: 18.6, size: 1.55, tilt: 12, radius: '42% 58% 40% 60%', opacity: 0.46, duration: 12.8, delay: -4.4 },
  { side: 'left', x: 4.8, top: 33.4, size: 3.25, tilt: 19, radius: '64% 36% 48% 52%', opacity: 0.42, duration: 14.2, delay: -7.2 },
  { side: 'left', x: 12.2, top: 52.8, size: 2.05, tilt: -9, radius: '46% 54% 66% 34%', opacity: 0.52, duration: 11.6, delay: -2.7 },
  { side: 'left', x: 5.6, top: 74.6, size: 1.82, tilt: 15, radius: '56% 44% 38% 62%', opacity: 0.44, duration: 13.4, delay: -5.3 },
  { side: 'right', x: 4.2, top: 8.4, size: 1.72, tilt: 16, radius: '38% 62% 48% 52%', opacity: 0.48, duration: 12.2, delay: -3.8 },
  { side: 'right', x: 8.8, top: 22.2, size: 2.8, tilt: -15, radius: '60% 40% 54% 46%', opacity: 0.42, duration: 15.1, delay: -8.1 },
  { side: 'right', x: 3.8, top: 41.8, size: 1.95, tilt: 9, radius: '50% 50% 36% 64%', opacity: 0.52, duration: 10.9, delay: -1.8 },
  { side: 'right', x: 10.8, top: 63.6, size: 2.34, tilt: -20, radius: '42% 58% 60% 40%', opacity: 0.46, duration: 13.9, delay: -6.5 },
  { side: 'right', x: 5.4, top: 82.2, size: 1.48, tilt: 18, radius: '62% 38% 42% 58%', opacity: 0.50, duration: 11.2, delay: -4.9 },
] as const;

export interface BubbleViewModel {
  id: string;
  word: string;
  meaning: string;
  side: 'left' | 'right';
  slot: number;
  xPercent: number;
  topPercent: number;
  tagWidthRem: number;
  tiltDegrees: number;
  swimDurationSeconds: number;
  arriveDelaySeconds: number;
  swimDelaySeconds: number;
  glowDelaySeconds: number;
  scale: number;
  opacity: number;
  blurPixels: number;
  index: number;
}

interface GlobalReviewBackdropProps {
  currentPath: string;
}

export function isReviewPath(path: string): boolean {
  const routePath = path.split('?')[0];
  return routePath === '/review';
}

export function splitBubbleWords(words: ReviewBubbleWordDto[]): BubbleViewModel[] {
  return words.slice(0, MAX_BUBBLES).map<BubbleViewModel>((word, index) => {
    const slot = Math.floor(index / 2);
    const side = index % 2 === 0 ? 'left' : 'right';
    const tiltMagnitude = TAG_TILT_PATTERN[slot] ?? 0;
    return {
      id: word.id,
      word: word.target_word,
      meaning: word.context_meaning,
      side,
      slot,
      xPercent: TAG_X_PATTERN[slot] ?? 8,
      topPercent: TAG_TOP_PATTERN[slot] ?? 8,
      tagWidthRem: TAG_WIDTH_PATTERN[slot] ?? 5,
      tiltDegrees: side === 'left' ? tiltMagnitude : -tiltMagnitude,
      swimDurationSeconds: 6.1 + slot * 0.45,
      arriveDelaySeconds: index * 0.054,
      swimDelaySeconds: slot * -0.24,
      glowDelaySeconds: slot * -0.16,
      scale: TAG_SCALE_PATTERN[slot] ?? 1,
      opacity: TAG_OPACITY_PATTERN[slot] ?? 0.84,
      blurPixels: TAG_BLUR_PATTERN[slot] ?? 0,
      index,
    };
  }).filter((bubble) => bubble.slot < MAX_BUBBLES_PER_SIDE);
}

export function GlobalReviewBackdrop({ currentPath }: GlobalReviewBackdropProps) {
  const [items, setItems] = useState<BubbleViewModel[]>([]);
  const [poppingIds, setPoppingIds] = useState<Set<string>>(() => new Set());
  const timeoutsRef = useRef<number[]>([]);
  const mountedRef = useRef(false);
  const isOnReviewPath = isReviewPath(currentPath);

  useEffect(() => {
    let cancelled = false;
    mountedRef.current = true;

    getDueReviewBubbles()
      .then((response) => {
        if (cancelled) return;
        setItems(splitBubbleWords(response.items));
        setPoppingIds(new Set());
      })
      .catch(() => {
        if (cancelled) return;
        setItems([]);
        setPoppingIds(new Set());
      });

    return () => {
      cancelled = true;
      mountedRef.current = false;
      timeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      timeoutsRef.current = [];
    };
  }, []);

  useEffect(() => {
    const handleReviewCompleted = (event: Event) => {
      const { cardId, rating } = (event as CustomEvent<ReviewCompletedEventDetail>).detail ?? {};
      if (!cardId || rating !== 'good') return;

      setItems((currentItems) => {
        if (!currentItems.some((item) => item.id === cardId)) {
          return currentItems;
        }

        if (!isOnReviewPath) {
          return currentItems.filter((item) => item.id !== cardId);
        }

        setPoppingIds((currentPoppingIds) => new Set(currentPoppingIds).add(cardId));
        const timeoutId = window.setTimeout(() => {
          if (!mountedRef.current) return;
          setItems((latestItems) => latestItems.filter((item) => item.id !== cardId));
          setPoppingIds((latestPoppingIds) => {
            const nextPoppingIds = new Set(latestPoppingIds);
            nextPoppingIds.delete(cardId);
            return nextPoppingIds;
          });
        }, POP_DURATION_MS);
        timeoutsRef.current.push(timeoutId);
        return currentItems;
      });
    };

    window.addEventListener(REVIEW_COMPLETED_EVENT, handleReviewCompleted);
    return () => {
      window.removeEventListener(REVIEW_COMPLETED_EVENT, handleReviewCompleted);
    };
  }, [isOnReviewPath]);

  const lanes = useMemo(() => ({
    left: items.filter((item) => item.side === 'left'),
    right: items.filter((item) => item.side === 'right'),
  }), [items]);

  return (
    <div className="global-review-backdrop" aria-hidden="true">
      <span className="global-review-backdrop__image-panel global-review-backdrop__image-panel--left" />
      <span className="global-review-backdrop__image-panel global-review-backdrop__image-panel--right" />
      <div className="global-review-backdrop__ambient">
        <span className="global-review-backdrop__mist global-review-backdrop__mist--left" />
        <span className="global-review-backdrop__mist global-review-backdrop__mist--right" />
        <span className="global-review-backdrop__halo global-review-backdrop__halo--left" />
        <span className="global-review-backdrop__halo global-review-backdrop__halo--right" />
        <svg className="global-review-backdrop__soft-ribbons global-review-backdrop__soft-ribbons--left" viewBox="0 0 360 900" preserveAspectRatio="none">
          <path className="global-review-backdrop__soft-ribbon global-review-backdrop__soft-ribbon--wide" d="M18 0 C156 94 22 202 176 316 C318 421 104 519 238 648 C318 724 214 808 338 900" />
          <path className="global-review-backdrop__soft-ribbon" d="M82 0 C218 126 70 230 220 358 C330 452 132 558 260 684 C330 754 246 822 352 900" />
          <path className="global-review-backdrop__soft-ribbon global-review-backdrop__soft-ribbon--fine" d="M0 206 C112 148 172 234 108 326 C34 434 188 462 162 578 C138 682 46 748 142 900" />
          <path className="global-review-backdrop__soft-ribbon global-review-backdrop__soft-ribbon--fine" d="M42 72 C174 114 248 170 214 256 C162 384 306 428 250 552 C202 660 286 752 224 860" />
        </svg>
        <svg className="global-review-backdrop__soft-ribbons global-review-backdrop__soft-ribbons--right" viewBox="0 0 360 900" preserveAspectRatio="none">
          <path className="global-review-backdrop__soft-ribbon global-review-backdrop__soft-ribbon--wide" d="M18 0 C156 94 22 202 176 316 C318 421 104 519 238 648 C318 724 214 808 338 900" />
          <path className="global-review-backdrop__soft-ribbon" d="M82 0 C218 126 70 230 220 358 C330 452 132 558 260 684 C330 754 246 822 352 900" />
          <path className="global-review-backdrop__soft-ribbon global-review-backdrop__soft-ribbon--fine" d="M0 206 C112 148 172 234 108 326 C34 434 188 462 162 578 C138 682 46 748 142 900" />
          <path className="global-review-backdrop__soft-ribbon global-review-backdrop__soft-ribbon--fine" d="M42 72 C174 114 248 170 214 256 C162 384 306 428 250 552 C202 660 286 752 224 860" />
        </svg>
        <span className="global-review-backdrop__ribbon-sparks global-review-backdrop__ribbon-sparks--left" />
        <span className="global-review-backdrop__ribbon-sparks global-review-backdrop__ribbon-sparks--right" />
        {DECORATIVE_BUBBLES.map((bubble, index) => (
          <span
            key={`${bubble.side}-${index}`}
            className={`global-review-backdrop__decor-bubble global-review-backdrop__decor-bubble--${bubble.side}`}
            style={{
              '--decor-bubble-x': `${bubble.x}%`,
              '--decor-bubble-top': `${bubble.top}%`,
              '--decor-bubble-size': `${bubble.size}rem`,
              '--decor-bubble-tilt': `${bubble.tilt}deg`,
              '--decor-bubble-radius': bubble.radius,
              '--decor-bubble-opacity': bubble.opacity,
              '--decor-bubble-duration': `${bubble.duration}s`,
              '--decor-bubble-delay': `${bubble.delay}s`,
            } as CSSProperties}
          />
        ))}
        <span className="global-review-backdrop__constellation global-review-backdrop__constellation--left" />
        <span className="global-review-backdrop__constellation global-review-backdrop__constellation--right" />
        <span className="global-review-backdrop__crystal-card" />
        <span className="global-review-backdrop__glow-orb" />
        <span className="global-review-backdrop__signal-ribbon global-review-backdrop__signal-ribbon--left" />
        <span className="global-review-backdrop__signal-ribbon global-review-backdrop__signal-ribbon--right" />
        <span className="global-review-backdrop__dust global-review-backdrop__dust--one" />
        <span className="global-review-backdrop__dust global-review-backdrop__dust--two" />
      </div>
      {items.length > 0 ? (
        <div className="global-review-backdrop__lanes">
          {(['left', 'right'] as const).map((side) => (
            <div key={side} className={`global-review-backdrop__lane global-review-backdrop__lane--${side}`}>
              {lanes[side].map((item) => (
                <div
                  key={item.id}
                  className={`review-bubble${poppingIds.has(item.id) ? ' review-bubble--popping' : ''}`}
                  style={{
                    '--review-bubble-top': `${item.topPercent}%`,
                    '--review-bubble-duration': `${item.swimDurationSeconds}s`,
                    '--review-bubble-arrive-delay': `${item.arriveDelaySeconds}s`,
                    '--review-bubble-swim-delay': `${item.swimDelaySeconds}s`,
                    '--review-bubble-glow-delay': `${item.glowDelaySeconds}s`,
                    '--review-bubble-x': `${item.xPercent}%`,
                    '--review-bubble-width': `${item.tagWidthRem}rem`,
                    '--review-bubble-tilt': `${item.tiltDegrees}deg`,
                    '--review-bubble-scale': item.scale,
                    '--review-bubble-opacity': item.opacity,
                    '--review-bubble-blur': `${item.blurPixels}px`,
                  } as CSSProperties}
                >
                  <span className="review-bubble__shine" />
                  <span className="review-bubble__word">{item.word}</span>
                  <span className="review-bubble__fragments" />
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
