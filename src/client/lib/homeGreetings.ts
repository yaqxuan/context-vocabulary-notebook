export type GreetingAudience = 'weekday' | 'weekend' | 'shared';

export type GreetingBucket =
  | '04:00-07:00'
  | '07:00-11:00'
  | '11:00-13:00'
  | '13:00-18:00'
  | '18:00-21:00'
  | '21:00-23:00'
  | '23:00-04:00';

export interface GreetingContext {
  date: string;
  bucket: GreetingBucket;
  audience: GreetingAudience;
}

export interface GreetingSelection extends GreetingContext {
  text: string;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const GREETING_PHRASES: Record<GreetingBucket, Record<GreetingAudience, string[]>> = {
  '04:00-07:00': {
    weekday: [
      '天还没亮，你已经来了。',
      '清晨很轻，你也在。',
      '这个点，城市还安静。',
      '这么早，已经见到你了。',
      '晨光还没铺开，你先到了。',
      '早一点，也安静一点。',
      '天色还浅，这里已经亮了。',
      '清晨留了一点安静给你。',
      '一天还没开始，你已经在这里。',
      '这个时间，很少有人打扰。',
    ],
    weekend: [
      '周末的清晨，你也来了。',
      '这么早，周末还很安静。',
      '周末天还没亮，你已经在。',
      '清晨很轻，连周末也是。',
      '周末的早风，还带着安静。',
      '这个点的周末，很少有人醒着。',
      '周末清晨，先在这里坐坐。',
      '天色还浅，周末也慢慢开始。',
      '周末这么早，已经见到你了。',
      '清晨还没展开，你先到了。',
    ],
    shared: [],
  },
  '07:00-11:00': {
    weekday: [
      '早上好，今天刚刚开始。',
      '早上好，慢慢展开。',
      '上午好，时间还宽。',
      '早上好，不用太赶。',
      '新的一天，先轻轻开始。',
      '上午的光还很干净。',
      '早上好，先从这里看看。',
      '今天还早，可以慢一点。',
      '上午好，风还轻。',
      '早上到了，一切才刚开始。',
    ],
    weekend: [
      '周末早上，你也来了。',
      '周末早上，慢慢看。',
      '周末的早晨，很适合轻一点。',
      '周末还早，不用赶。',
      '早上的周末，时间很宽。',
      '周末醒来，先看看这里。',
      '周末早上，风也慢一点。',
      '这个早晨，适合随意一点。',
      '周末开始了，慢慢来。',
      '早上好，周末也见到你。',
    ],
    shared: [],
  },
  '11:00-13:00': {
    weekday: [
      '中午了，可以停一停。',
      '快中午了，缓一缓。',
      '上午走到这里了。',
      '中午到了，歇一口气。',
      '日头高了，慢一点。',
      '午前的时间快过去了。',
      '中午好，先放松一下。',
      '上午差不多了，别太急。',
      '这个时候，适合停一会儿。',
      '中午了，给自己一点空隙。',
    ],
    weekend: [
      '中午了，来看看也好。',
      '周末中午，慢一点。',
      '午前的时间，还算宽。',
      '中午到了，先停一停。',
      '周末中午，不用太急。',
      '日头高了，周末也慢慢过。',
      '中午好，随便看看也好。',
      '周末走到中午了。',
      '午饭前，先来这里待一会儿。',
      '这个中午，很适合缓下来。',
    ],
    shared: [],
  },
  '13:00-18:00': {
    weekday: [
      '下午好，慢慢来。',
      '下午了，不必太赶。',
      '午后的时间，缓一点。',
      '下午好，先从这里开始。',
      '阳光往后移了一点。',
      '下午的节奏，可以轻一点。',
      '下午了，给自己一点耐心。',
      '这个时间，慢慢看就好。',
      '午后容易散，先待一会儿。',
      '下午好，不急着往前赶。',
    ],
    weekend: [
      '周末下午，你还记得这里。',
      '下午了，周末也慢慢过。',
      '周末午后，适合轻轻翻一页。',
      '周末还长，慢慢来。',
      '午后的周末，时间松一点。',
      '下午好，周末也见到你。',
      '周末下午，阳光慢慢斜了。',
      '这个下午，可以轻一点。',
      '周末的下午，不用太满。',
      '下午了，先在这里歇一下。',
    ],
    shared: [],
  },
  '18:00-21:00': {
    weekday: [
      '晚上好，一天慢慢收尾了。',
      '晚上了，今天走到这里。',
      '傍晚好，天色慢下来了。',
      '晚上好，你又来了。',
      '天暗下来了，这里还在。',
      '晚上了，可以缓一缓。',
      '今天快过去了，先坐一会儿。',
      '晚上的时间，安静一点。',
      '灯亮起来了，你也到了。',
      '晚上好，今天也到这个时候了。',
    ],
    weekend: [
      '周末晚上，你也回来了。',
      '周末晚上，天色慢下来了。',
      '周末快收尾了，你还在。',
      '晚上好，周末也见到你。',
      '周末的灯亮起来了。',
      '晚上了，周末还剩一点安静。',
      '周末晚上，慢慢待一会儿。',
      '天暗下来了，周末也温和一点。',
      '周末到了晚上，先缓一缓。',
      '晚上好，今天也走到这里了。',
    ],
    shared: [],
  },
  '21:00-23:00': {
    weekday: [
      '夜里安静，慢慢来。',
      '晚了，不用急。',
      '夜深一点，也安静一点。',
      '这个时间，适合慢下来。',
      '夜色沉下来了。',
      '晚一点，也没关系。',
      '夜里了，这里还亮着。',
      '这个时候，不用赶。',
      '夜深了，声音都轻了。',
      '晚了，先陪你待一会儿。',
    ],
    weekend: [
      '夜里安静，你还在。',
      '周末夜里，也慢慢来。',
      '深了，这里还亮着。',
      '夜安静下来，你也来了。',
      '周末的夜，声音轻了。',
      '晚了，周末也慢下来。',
      '夜里了，先陪你一会儿。',
      '周末快过去了，不用急。',
      '这个夜晚，很安静。',
      '深夜前，先在这里坐坐。',
    ],
    shared: [],
  },
  '23:00-04:00': {
    weekday: [],
    weekend: [],
    shared: [
      '还没睡，陪你一会儿。',
      '这么晚了，你还在。',
      '深夜了，这里还亮着。',
      '夜很深了，在呢。',
      '这个时间，世界安静下来。',
      '夜已经很深，先陪你坐会儿。',
      '晚到这个点了，慢慢来。',
      '深夜里，这里还在。',
      '夜色很沉，你也还在。',
      '这么晚了，先不急。',
    ],
  },
};

export function getGreetingContext(now: Date = new Date()): GreetingContext {
  const hours = now.getHours();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;

  let bucket: GreetingBucket;
  let audience: GreetingAudience;

  if (hours >= 23 || hours < 4) {
    bucket = '23:00-04:00';
    audience = 'shared';
  } else {
    if (hours >= 4 && hours < 7) {
      bucket = '04:00-07:00';
    } else if (hours >= 7 && hours < 11) {
      bucket = '07:00-11:00';
    } else if (hours >= 11 && hours < 13) {
      bucket = '11:00-13:00';
    } else if (hours >= 13 && hours < 18) {
      bucket = '13:00-18:00';
    } else if (hours >= 18 && hours < 21) {
      bucket = '18:00-21:00';
    } else {
      bucket = '21:00-23:00';
    }

    const dayOfWeek = now.getDay();
    audience = (dayOfWeek === 0 || dayOfWeek === 6) ? 'weekend' : 'weekday';
  }

  return {
    date: dateStr,
    bucket,
    audience,
  };
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0, len = str.length; i < len; i++) {
    const chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

function getSafeStorage(): StorageLike | undefined {
  try {
    return typeof window !== 'undefined' ? window.localStorage : undefined;
  } catch (e) {
    return undefined;
  }
}

export function getHomeGreeting({
  now = new Date(),
  storage = getSafeStorage(),
}: {
  now?: Date;
  storage?: StorageLike;
} = {}): GreetingSelection {
  const context = getGreetingContext(now);
  const candidates = GREETING_PHRASES[context.bucket][context.audience];

  if (!candidates || candidates.length === 0) {
    // Should never happen based on GREETING_PHRASES setup, but safety first
    return { ...context, text: '' };
  }

  const selectionKey = `homeGreetingSelection:${context.bucket}:${context.audience}`;
  const lastKey = `homeGreetingLast:${context.bucket}:${context.audience}`;

  try {
    if (storage) {
      const stored = storage.getItem(selectionKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (
          parsed.date === context.date &&
          parsed.bucket === context.bucket &&
          parsed.audience === context.audience &&
          candidates.includes(parsed.text)
        ) {
          return parsed;
        }
      }
    }
  } catch (e) {
    // Ignore storage errors
  }

  let lastText = '';
  try {
    if (storage) {
      lastText = storage.getItem(lastKey) || '';
    }
  } catch (e) {
    // Ignore storage errors
  }

  let availableCandidates = candidates;
  if (candidates.length > 1 && lastText && candidates.includes(lastText)) {
    availableCandidates = candidates.filter((c) => c !== lastText);
  }

  const hashKey = `${context.date}:${context.bucket}:${context.audience}`;
  const index = hashCode(hashKey) % availableCandidates.length;
  const text = availableCandidates[index];

  const selection: GreetingSelection = { ...context, text };

  try {
    if (storage) {
      storage.setItem(selectionKey, JSON.stringify(selection));
      storage.setItem(lastKey, text);
    }
  } catch (e) {
    // Ignore storage errors
  }

  return selection;
}
