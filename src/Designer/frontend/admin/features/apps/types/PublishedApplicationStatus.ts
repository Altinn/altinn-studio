import type { RunningAppStatus } from 'app-shared/types/api/RunningApp';

/** How an app published to an environment runs. */
export type PublishedApplicationStatus = {
  app: string;
  /** Null when the runtime gateway could not tell, such as for an app that does not run in the cluster. */
  status: RunningAppStatus | null;
  /** The version of the app libraries the app reports, or null when it did not answer. */
  appLibVersion: string | null;
};
