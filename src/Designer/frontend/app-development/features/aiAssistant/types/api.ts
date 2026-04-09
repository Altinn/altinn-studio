export type {
  ChatThreadResponse,
  CreateChatMessagePayload as CreateChatMessageRequest,
} from 'app-shared/types/api/ChatPayloads';

export type ChatMessageResponse = {
  id: string;
  threadId: string;
  createdAt: string;
  role: 'User' | 'Assistant';
  content: string;
  actionMode?: 'Ask' | 'Edit' | null;
  attachmentFileNames?: string[] | null;
  filesChanged?: string[] | null;
};
