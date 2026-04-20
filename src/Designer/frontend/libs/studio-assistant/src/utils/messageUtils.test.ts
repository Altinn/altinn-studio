import { createAssistantMessage, createUserMessage } from './messageUtils';
import { MessageAuthor } from '../types/MessageAuthor';

describe('messageUtils', () => {
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
