import type { AssistantMessage, ChatThread, UserMessage } from '../types/ChatThread';
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

export function createUserMessage(content: string, allowEditing: boolean): UserMessage {
  return {
    author: MessageAuthor.User,
    content,
    timestamp: new Date(),
    allowEditing,
  };
}
