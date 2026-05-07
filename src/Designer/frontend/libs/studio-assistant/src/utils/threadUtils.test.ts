import { createNewChatThread } from './threadUtils';

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
});
