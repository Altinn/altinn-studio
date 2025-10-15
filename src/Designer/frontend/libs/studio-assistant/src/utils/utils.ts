import type { AssistantMessage, ChatThread, UserMessage } from '../types/ChatThread';
import { MessageAuthor } from '../types/MessageAuthor';

export function createNewChatThread(title: string): ChatThread {
  return {
    id: crypto.randomUUID(),
    title,
    messages: [],
  };
}

export function findThreadById(
  chatThreads: ChatThread[],
  threadId: string,
): ChatThread | undefined {
  return chatThreads.find((t) => t.id === threadId);
}

export function createAssistantMessage(content: string): AssistantMessage {
  return {
    author: MessageAuthor.Assistant,
    content,
    timestamp: new Date(),
  };
}

export function createUserMessage(content: string, allowAppChanges: boolean): UserMessage {
  return {
    author: MessageAuthor.User,
    content,
    timestamp: new Date(),
    allowAppChanges,
  };
}
