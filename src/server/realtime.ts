import "server-only";

import { EventEmitter } from "node:events";

/**
 * In-process realtime bus for Server-Sent Events.
 *
 * Good for a single self-hosted Node process (VPS / one container). To scale
 * horizontally, back this with Redis pub/sub: publish to Redis here and have
 * each instance subscribe and re-emit locally. The public API below stays the
 * same, so callers don't change.
 */
export type RealtimeEvent =
  | { type: "notification"; payload: NotificationPayload }
  | { type: "schedule"; payload: { reason: string } }
  | { type: "ping"; payload: { t: number } };

export type NotificationPayload = {
  id: string;
  type: string;
  title: string;
  message: string;
  linkUrl: string | null;
  createdAt: string;
};

const globalForBus = globalThis as unknown as { __spkBus?: EventEmitter };
const bus =
  globalForBus.__spkBus ??
  (globalForBus.__spkBus = new EventEmitter().setMaxListeners(0));

const channel = (userId: string) => `user:${userId}`;

/** Publish an event to a specific user's subscribers. */
export function publishToUser(userId: string, event: RealtimeEvent) {
  bus.emit(channel(userId), event);
}

/** Subscribe to a user's events; returns an unsubscribe function. */
export function subscribeToUser(
  userId: string,
  listener: (event: RealtimeEvent) => void,
) {
  const ch = channel(userId);
  bus.on(ch, listener);
  return () => bus.off(ch, listener);
}
