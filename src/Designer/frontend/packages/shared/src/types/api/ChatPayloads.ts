export type ChatThreadResponse = {
  id: string;
  title: string;
  createdAt: string;
};

export type ChatSource = {
  tool: string;
  title: string;
  previewText: string;
  contentLength?: number | null;
  url?: string | null;
  relevance?: number | null;
  matchedTerms?: string | null;
  cited?: boolean | null;
};

export type CreateChatMessagePayload = {
  role: 'User' | 'Assistant';
  content: string;
  allowAppChanges?: boolean | null;
  attachmentFileNames?: string[] | null;
  filesChanged?: string[] | null;
  sources?: ChatSource[] | null;
};
