export type PublishedApplicationDetails = {
  org: string;
  env: string;
  app: string;
  version: string;
  appLibVersion?: string;
  appFrontendVersion?: string;
  commit: string;
  createdAt: string;
  createdBy: string;
};
