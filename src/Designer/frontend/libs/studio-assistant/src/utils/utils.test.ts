import { createAssistantMessage, createNewChatThread, createUserMessage } from './utils';
import { MessageAuthor } from '../types/MessageAuthor';

describe('utils', () => {
  describe('createNewChatThread', () => {
    it('should create a chat thread with the provided title', () => {
      const title = 'Test Chat Thread';
      const thread = createNewChatThread(title);

      expect(thread.title).toBe(title);
      expect(thread.messages).toEqual([]);
    });

    it('should initialize with an empty messages array', () => {
      const thread = createNewChatThread('Empty Thread');
      const isArray = Array.isArray(thread.messages);
      expect(isArray).toBe(true);
      expect(thread.messages).toHaveLength(0);
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
    it('should create a user message with the provided content and allowEditing flag', () => {
      const content = 'This is a user message';
      const allowEditing = true;
      const message = createUserMessage(content, allowEditing);

      expect(message.author).toBe(MessageAuthor.User);
      expect(message.content).toBe(content);
      expect(message.allowAppChanges).toBe(allowEditing);
      expect(message.timestamp).toBeInstanceOf(Date);
    });
  });
});
