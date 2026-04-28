export type ChatThread = {
  id: string;
  title: string;
  org: string;
  app: string;
  createdBy: string;
  createdAt: string;
};

export type CreateChatThreadPayload = Pick<ChatThread, 'title'>;
