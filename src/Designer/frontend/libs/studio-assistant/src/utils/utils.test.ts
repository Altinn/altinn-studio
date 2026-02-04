import { createAssistantMessage, createNewChatThread, createUserMessage } from './utils';
import { MessageAuthor } from '../types/MessageAuthor';

if (!globalThis.crypto) {
  Object.defineProperty(globalThis, 'crypto', {
    value: {
      randomUUID: () => `${Math.random().toString(36).substring(2)}-${Date.now()}`,
    },
    configurable: true,
  });
}

describe('utils', () => {
  describe('createNewChatThread', () => {
    it('should create a chat thread with required properties', () => {
      const title = 'Test Chat Thread';
      const thread = createNewChatThread(title);

      expect(thread.id).toBeTruthy();
      expect(thread.title).toBe(title);
      expect(thread.messages).toEqual([]);
    });

    it('should generate unique ids for every thread', () => {
      const thread1 = createNewChatThread('Test Chat Thread');
      const thread2 = createNewChatThread('Test Chat Thread');
      expect(thread1.id).not.toEqual(thread2.id);
    });
  });

  describe('createAssistantMessage', () => {
    it('should create an assistant message with the provided content', () => {
      const content = 'Hello, how can I help you?';
      const message = createAssistantMessage(content);

      expect(message.author).toBe(MessageAuthor.Assistant);
      expect(message.content).toBe(content);
      expect(message.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('createUserMessage', () => {
    it('should create a user message with the provided content, allowAppChanges flag and attachments', () => {
      const content = 'This is a user message';
      const allowAppChanges = true;
      const attachments = [
        {
          name: 'design.pdf',
          mimeType: 'application/pdf',
          size: 1234,
          dataBase64: 'BASE64',
        },
      ];
      const message = createUserMessage(content, allowAppChanges, attachments);

      expect(message.author).toBe(MessageAuthor.User);
      expect(message.content).toBe(content);
      expect(message.allowAppChanges).toBe(allowAppChanges);
      expect(message.timestamp).toBeInstanceOf(Date);
      expect(message.attachments).toEqual(attachments);
    });
  });
});
