export type BotAccount = {
  id: string;
  username: string;
  organizationName: string;
  deactivated: boolean;
  created: string;
  createdByUsername: string | null;
  deployEnvironments: string[];
  apiKeyCount: number;
};

export type CreateBotAccountRequest = {
  name: string;
  deployEnvironments: string[] | null;
};

export type CreateBotAccountResponse = {
  id: string;
  username: string;
  organizationName: string;
  created: string;
};

export type BotAccountApiKey = {
  id: number;
  name: string;
  expiresAt: string;
  createdAt: string;
  createdByUsername: string | null;
};

export type CreateBotAccountApiKeyRequest = {
  name: string;
  expiresAt: string;
};

export type CreateBotAccountApiKeyResponse = {
  id: number;
  key: string;
  name: string;
  expiresAt: string;
  createdByUsername: string;
};
