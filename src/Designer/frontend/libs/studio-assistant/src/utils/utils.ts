import type { Message } from '../types/AssistantConfig';
import { MessageAuthor } from '../types/MessageAuthor';

export function createUserMessage(content: string): Message {
  return {
    author: MessageAuthor.User,
    message: content,
  };
}
