import type { AssistantMessage, ChatThread } from '../types/ChatThread';
import { MessageAuthor } from '../types/MessageAuthor';

export function createGreetingMessage(): AssistantMessage {
  return {
    author: MessageAuthor.Assistant,
    content: 'Hva kan jeg hjelpe med?',
    timestamp: new Date(),
  };
}

export function createEmptyChatThread(): ChatThread {
  return {
    id: 'a1b2c3d4',
    title: 'New chat',
    messages: [],
  };
}
