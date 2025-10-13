import type { AssistantMessage, ChatThread, UserMessage } from '../types/ChatThread';
import { MessageAuthor } from '../types/MessageAuthor';

export function createAssistantGreetingMessage(content: string): AssistantMessage {
  return {
    author: MessageAuthor.Assistant,
    content,
    timestamp: new Date(),
  };
}

export function createNewChatThread(title: string): ChatThread {
  return {
    title,
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
