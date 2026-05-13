export type StudioctlAuthRequest = {
  username: string;
  clientName: string;
  tokenName: string;
  expiresAt: string;
};

export type StudioctlAuthCallback = {
  callbackUrl: string;
};
