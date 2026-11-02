import { describe, expect, it } from 'vitest';
import { createNewChatThread, orderThreadIdsByDistance } from './threadUtils';

if (!globalThis.crypto) {
  Object.defineProperty(globalThis, 'crypto', {
    value: {
      randomUUID: () => `${Math.random().toString(36).substring(2)}-${Date.now()}`,
    },
    configurable: true,
  });
}

describe('threadUtils', () => {
  describe('createNewChatThread', () => {
    it('should create a chat thread with required properties', () => {
      const title = 'Test Chat Thread';
      const thread = createNewChatThread(title);

      expect(thread.id).toBeTruthy();
      expect(thread.title).toBe(title);
    });

    it('should generate unique ids for every thread', () => {
      const thread1 = createNewChatThread('Test Chat Thread');
      const thread2 = createNewChatThread('Test Chat Thread');
      expect(thread1.id).not.toEqual(thread2.id);
    });
  });

  describe('orderThreadIdsByDistance', () => {
    const threadIds = ['a', 'b', 'c', 'd'];

    it('returns the threads after the removed thread, and then the threads before it, nearest first', () => {
      expect(orderThreadIdsByDistance(threadIds, 'b')).toEqual(['c', 'd', 'a']);
    });

    it('returns the threads before the last thread, nearest first', () => {
      expect(orderThreadIdsByDistance(threadIds, 'd')).toEqual(['c', 'b', 'a']);
    });

    it('returns no threads when the removed thread was the only one', () => {
      expect(orderThreadIdsByDistance(['a'], 'a')).toEqual([]);
    });

    it('returns no threads when the list does not contain the thread', () => {
      expect(orderThreadIdsByDistance(threadIds, 'x')).toEqual([]);
    });
  });
});
