export enum MessageAuthor {
  User = 'User',
  Assistant = 'Assistant',
}

type Source = {
  title: string;
  url?: string;
  kind?: string;
  /** Legacy fields from the retired retrieval pipeline — still present
   *  on messages persisted before the agentic-loop architecture. */
  tool?: string;
  previewText?: string;
  contentLength?: number;
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
  attachmentInstructionFlagged?: boolean;
  traceId?: string;
  feedbackThumbsUp?: boolean | null;
};

export type CreateChatMessagePayload = Omit<ChatMessage, 'id' | 'threadId' | 'createdAt'>;
