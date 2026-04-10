import type { ChatSource } from 'app-shared/types/api';

export type {
  ChatThreadResponse,
  ChatSource,
  CreateChatMessagePayload as CreateChatMessageRequest,
} from 'app-shared/types/api/ChatPayloads';

export type ChatMessageResponse = {
  id: string;
  threadId: string;
  createdAt: string;
  role: 'User' | 'Assistant';
  content: string;
  allowAppChanges?: boolean | null;
  attachmentFileNames?: string[] | null;
  filesChanged?: string[] | null;
  sources?: ChatSource[] | null;
};
