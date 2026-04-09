export type ChatThreadResponse = {
  id: string;
  title: string;
  createdAt: string;
};

export type CreateChatMessagePayload = {
  role: 'User' | 'Assistant';
  content: string;
  actionMode?: 'Ask' | 'Edit' | null;
  attachmentFileNames?: string[] | null;
  filesChanged?: string[] | null;
};
