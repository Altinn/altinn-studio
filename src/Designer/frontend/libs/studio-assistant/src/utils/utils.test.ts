import { createAssistantMessage, createNewChatThread, createUserMessage } from './utils';
import { MessageAuthor } from '../types/MessageAuthor';

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
    it('should create a user message with the provided content and allowAppChanges flag', () => {
      const content = 'This is a user message';
      const allowAppChanges = true;
      const message = createUserMessage(content, allowAppChanges);

      expect(message.author).toBe(MessageAuthor.User);
      expect(message.content).toBe(content);
      expect(message.allowAppChanges).toBe(allowAppChanges);
      expect(message.timestamp).toBeInstanceOf(Date);
    });
  });
});
