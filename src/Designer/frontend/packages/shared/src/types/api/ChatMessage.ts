export enum MessageAuthor {
  User = 'User',
  Assistant = 'Assistant',
}

type Source = {
  tool: string;
  title: string;
  previewText?: string;
  contentLength?: number;
  url?: string;
  relevance?: number;
  matchedTerms?: string;
  cited?: boolean;
};

export type ChatMessage = {
  id: string;
  threadId: string;
  createdAt: string;
  role: MessageAuthor;
  content: string;
  allowAppChanges?: boolean;
  attachmentFileNames?: string[];
  filesChanged?: string[];
  sources?: Source[];
};

export type CreateChatMessagePayload = Omit<ChatMessage, 'id' | 'threadId' | 'createdAt'>;
