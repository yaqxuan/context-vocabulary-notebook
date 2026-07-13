import { describe, expect, it } from 'vitest';

import {
  createBubbleBody,
  resolveBubbleCollisions,
  stepBubbleBodies,
  type BubblePhysicsBody,
} from '../../src/client/utils/bubblePhysics';

describe('bubble physics', () => {
  it('places new bubbles inside the lane without overlapping existing bubbles', () => {
    let seed = 19;
    const random = () => {
      seed = (seed * 48271) % 0x7fffffff;
      return seed / 0x7fffffff;
    };
    const bodies: BubblePhysicsBody[] = [];
    for (let index = 0; index < 8; index += 1) {
      bodies.push(createBubbleBody(`bubble-${index}`, 34, 240, 900, bodies, random));
    }

    for (const body of bodies) {
      expect(body.x - body.radius).toBeGreaterThanOrEqual(10);
      expect(body.x + body.radius).toBeLessThanOrEqual(230);
      expect(body.y - body.radius).toBeGreaterThanOrEqual(10);
      expect(body.y + body.radius).toBeLessThanOrEqual(890);
    }
    for (let first = 0; first < bodies.length; first += 1) {
      for (let second = first + 1; second < bodies.length; second += 1) {
        expect(Math.hypot(bodies[first].x - bodies[second].x, bodies[first].y - bodies[second].y))
          .toBeGreaterThanOrEqual(bodies[first].radius + bodies[second].radius);
      }
    }
  });

  it('separates colliding bubbles and sends them away from one another', () => {
    const bodies: BubblePhysicsBody[] = [
      { id: 'left', x: 90, y: 120, vx: 18, vy: 0, radius: 30, turnIn: 4 },
      { id: 'right', x: 130, y: 120, vx: -18, vy: 0, radius: 30, turnIn: 4 },
    ];

    resolveBubbleCollisions(bodies, 240, 500);

    expect(Math.hypot(bodies[0].x - bodies[1].x, bodies[0].y - bodies[1].y)).toBeGreaterThanOrEqual(67);
    expect(bodies[0].vx).toBeLessThan(0);
    expect(bodies[1].vx).toBeGreaterThan(0);
  });

  it('keeps long-running random motion inside the lane and collision-free', () => {
    let seed = 7;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const bodies: BubblePhysicsBody[] = [];
    for (let index = 0; index < 6; index += 1) {
      bodies.push(createBubbleBody(`bubble-${index}`, 31, 230, 720, bodies, random));
    }

    for (let frame = 0; frame < 2400; frame += 1) {
      stepBubbleBodies(bodies, 230, 720, 1 / 60, random);
    }

    for (const body of bodies) {
      expect(body.x - body.radius).toBeGreaterThanOrEqual(10);
      expect(body.x + body.radius).toBeLessThanOrEqual(220);
      expect(body.y - body.radius).toBeGreaterThanOrEqual(10);
      expect(body.y + body.radius).toBeLessThanOrEqual(710);
    }
    for (let first = 0; first < bodies.length; first += 1) {
      for (let second = first + 1; second < bodies.length; second += 1) {
        expect(Math.hypot(bodies[first].x - bodies[second].x, bodies[first].y - bodies[second].y))
          .toBeGreaterThanOrEqual(bodies[first].radius + bodies[second].radius);
      }
    }
  });
});
