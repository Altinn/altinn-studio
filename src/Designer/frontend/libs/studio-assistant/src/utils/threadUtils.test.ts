import { describe, expect, it } from 'vitest';
import { createNewChatThread, findNearestRemainingThreadId } from './threadUtils';

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

  describe('findNearestRemainingThreadId', () => {
    const threadIds = ['a', 'b', 'c', 'd'];

    it('returns the next thread when it remains', () => {
      expect(findNearestRemainingThreadId(threadIds, ['a', 'c', 'd'], 'b')).toBe('c');
    });

    it('skips the threads after the removed thread that are also removed', () => {
      expect(findNearestRemainingThreadId(threadIds, ['a', 'd'], 'b')).toBe('d');
    });

    it('returns the nearest thread before the removed thread when no thread after it remains', () => {
      expect(findNearestRemainingThreadId(threadIds, ['a', 'b'], 'd')).toBe('b');
    });

    it('returns undefined when no thread remains', () => {
      expect(findNearestRemainingThreadId(['a'], [], 'a')).toBeUndefined();
    });

    it('returns undefined when the previous list does not contain the thread', () => {
      expect(findNearestRemainingThreadId(threadIds, threadIds, 'x')).toBeUndefined();
    });
  });
});
