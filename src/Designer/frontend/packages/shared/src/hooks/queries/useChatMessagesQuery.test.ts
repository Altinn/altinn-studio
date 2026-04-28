import { mapChatMessageToFrontend } from './useChatMessagesQuery';
import { MessageAuthor } from 'app-shared/types/api';
import type { ChatMessage } from 'app-shared/types/api';

const baseMessage: ChatMessage = {
  id: 'msg-1',
  threadId: 'thread-1',
  createdAt: '2025-01-01T00:00:00Z',
  content: 'Hello',
  role: MessageAuthor.User,
};

describe('mapChatMessageToFrontend', () => {
  describe('user message', () => {
    it('maps base fields', () => {
      const message: ChatMessage = { ...baseMessage, allowAppChanges: true };
      const result = mapChatMessageToFrontend(message);
      expect(result.id).toBe(message.id);
      expect(result.role).toBe(message.role);
      expect(result.content).toBe(message.content);
      expect(result.createdAt).toBe(message.createdAt);
    });

    it('maps allowAppChanges', () => {
      const result = mapChatMessageToFrontend({ ...baseMessage, allowAppChanges: true });
      expect(result).toMatchObject({ allowAppChanges: true });
    });

    it('maps attachmentFileNames to attachments', () => {
      const message: ChatMessage = {
        ...baseMessage,
        allowAppChanges: false,
        attachmentFileNames: ['file-a.pdf', 'file-b.png'],
      };
      const result = mapChatMessageToFrontend(message);
      expect(result).toMatchObject({
        attachments: [{ name: 'file-a.pdf' }, { name: 'file-b.png' }],
      });
    });

    it('returns empty attachments when attachmentFileNames is absent', () => {
      const result = mapChatMessageToFrontend({ ...baseMessage, allowAppChanges: false });
      expect(result).toMatchObject({ attachments: [] });
    });

    it('falls back to false when allowAppChanges is absent', () => {
      const result = mapChatMessageToFrontend(baseMessage);
      expect(result).toMatchObject({ allowAppChanges: false });
    });
  });

  describe('assistant message', () => {
    const assistantBase: ChatMessage = {
      ...baseMessage,
      role: MessageAuthor.Assistant,
    };

    it('maps base fields', () => {
      const result = mapChatMessageToFrontend(assistantBase);
      expect(result.id).toBe(assistantBase.id);
      expect(result.role).toBe(assistantBase.role);
      expect(result.content).toBe(assistantBase.content);
      expect(result.createdAt).toBe(assistantBase.createdAt);
    });

    it('maps filesChanged', () => {
      const message: ChatMessage = { ...assistantBase, filesChanged: ['src/a.ts', 'src/b.ts'] };
      const result = mapChatMessageToFrontend(message);
      expect(result).toMatchObject({ filesChanged: ['src/a.ts', 'src/b.ts'] });
    });

    it('maps sources', () => {
      const sources = [{ tool: 'search', title: 'Doc', previewText: 'preview' }];
      const message: ChatMessage = { ...assistantBase, sources };
      const result = mapChatMessageToFrontend(message);
      expect(result).toMatchObject({ sources });
    });

    it('leaves filesChanged and sources undefined when absent', () => {
      const result = mapChatMessageToFrontend(assistantBase);
      expect(result).toMatchObject({ filesChanged: undefined, sources: undefined });
    });
  });
});
