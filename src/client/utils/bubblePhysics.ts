export interface BubblePhysicsBody {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  turnIn: number;
}

const EDGE_PADDING = 10;
const COLLISION_GAP = 7;
const MIN_SPEED = 11;
const MAX_SPEED = 24;

type RandomSource = () => number;

function between(min: number, max: number, random: RandomSource): number {
  if (max <= min) return min;
  return min + (max - min) * random();
}

function clampBody(body: BubblePhysicsBody, width: number, height: number): void {
  const minX = body.radius + EDGE_PADDING;
  const maxX = Math.max(minX, width - body.radius - EDGE_PADDING);
  const minY = body.radius + EDGE_PADDING;
  const maxY = Math.max(minY, height - body.radius - EDGE_PADDING);
  body.x = Math.min(maxX, Math.max(minX, body.x));
  body.y = Math.min(maxY, Math.max(minY, body.y));
}

function candidateClearance(
  x: number,
  y: number,
  radius: number,
  bodies: BubblePhysicsBody[],
): number {
  if (bodies.length === 0) return Number.POSITIVE_INFINITY;
  return Math.min(...bodies.map((body) => (
    Math.hypot(body.x - x, body.y - y) - body.radius - radius - COLLISION_GAP
  )));
}

export function createBubbleBody(
  id: string,
  radius: number,
  width: number,
  height: number,
  existing: BubblePhysicsBody[],
  random: RandomSource = Math.random,
): BubblePhysicsBody {
  const minX = radius + EDGE_PADDING;
  const maxX = Math.max(minX, width - radius - EDGE_PADDING);
  const minY = radius + EDGE_PADDING;
  const maxY = Math.max(minY, height - radius - EDGE_PADDING);
  let best = { x: minX, y: minY, clearance: Number.NEGATIVE_INFINITY };

  for (let attempt = 0; attempt < 80; attempt += 1) {
    const x = between(minX, maxX, random);
    const y = between(minY, maxY, random);
    const clearance = candidateClearance(x, y, radius, existing);
    if (clearance > best.clearance) best = { x, y, clearance };
    if (clearance >= COLLISION_GAP) break;
  }

  const angle = random() * Math.PI * 2;
  const speed = between(MIN_SPEED, MAX_SPEED, random);
  return {
    id,
    x: best.x,
    y: best.y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius,
    turnIn: between(1.5, 4.8, random),
  };
}

function keepUsefulSpeed(body: BubblePhysicsBody): void {
  const speed = Math.hypot(body.vx, body.vy);
  if (speed === 0) {
    body.vx = MIN_SPEED;
    return;
  }
  if (speed < MIN_SPEED) {
    body.vx *= MIN_SPEED / speed;
    body.vy *= MIN_SPEED / speed;
  } else if (speed > MAX_SPEED) {
    body.vx *= MAX_SPEED / speed;
    body.vy *= MAX_SPEED / speed;
  }
}

export function resolveBubbleCollisions(
  bodies: BubblePhysicsBody[],
  width: number,
  height: number,
): void {
  for (let pass = 0; pass < 3; pass += 1) {
    for (let firstIndex = 0; firstIndex < bodies.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < bodies.length; secondIndex += 1) {
        const first = bodies[firstIndex];
        const second = bodies[secondIndex];
        let dx = second.x - first.x;
        let dy = second.y - first.y;
        let distance = Math.hypot(dx, dy);
        const minimumDistance = first.radius + second.radius + COLLISION_GAP;
        if (distance >= minimumDistance) continue;

        if (distance < 0.001) {
          dx = 1;
          dy = 0;
          distance = 1;
        }
        const normalX = dx / distance;
        const normalY = dy / distance;
        const separation = (minimumDistance - distance) / 2;
        first.x -= normalX * separation;
        first.y -= normalY * separation;
        second.x += normalX * separation;
        second.y += normalY * separation;

        const relativeVelocity = (second.vx - first.vx) * normalX + (second.vy - first.vy) * normalY;
        if (relativeVelocity < 0) {
          const impulse = -(1.84 * relativeVelocity) / 2;
          first.vx -= impulse * normalX;
          first.vy -= impulse * normalY;
          second.vx += impulse * normalX;
          second.vy += impulse * normalY;
        }
        clampBody(first, width, height);
        clampBody(second, width, height);
      }
    }
  }
}

export function stepBubbleBodies(
  bodies: BubblePhysicsBody[],
  width: number,
  height: number,
  deltaSeconds: number,
  random: RandomSource = Math.random,
): void {
  const safeDelta = Math.min(0.05, Math.max(0, deltaSeconds));
  for (const body of bodies) {
    body.turnIn -= safeDelta;
    if (body.turnIn <= 0) {
      const currentAngle = Math.atan2(body.vy, body.vx);
      const nextAngle = currentAngle + between(-0.82, 0.82, random);
      const nextSpeed = between(MIN_SPEED, MAX_SPEED, random);
      body.vx = Math.cos(nextAngle) * nextSpeed;
      body.vy = Math.sin(nextAngle) * nextSpeed;
      body.turnIn = between(1.5, 4.8, random);
    }

    body.x += body.vx * safeDelta;
    body.y += body.vy * safeDelta;
    const minX = body.radius + EDGE_PADDING;
    const maxX = Math.max(minX, width - body.radius - EDGE_PADDING);
    const minY = body.radius + EDGE_PADDING;
    const maxY = Math.max(minY, height - body.radius - EDGE_PADDING);
    if (body.x <= minX || body.x >= maxX) body.vx *= -1;
    if (body.y <= minY || body.y >= maxY) body.vy *= -1;
    clampBody(body, width, height);
    keepUsefulSpeed(body);
  }
  resolveBubbleCollisions(bodies, width, height);
}
