/** Whether an app runs its latest version. A deploy and a restart both make it `updating`. */
export type RunningAppStatus = 'ready' | 'updating' | 'unavailable' | 'failed';

/** The app as it runs in an environment. */
export interface RunningApp {
  environment: string;
  /** Null when the runtime gateway could not tell the deployed tag. */
  version: string | null;
  /** The build of the deploy that runs, or null when the app has not been deployed since this was recorded. */
  buildId: string | null;
  /** Null when the runtime gateway could not tell, and missing from a backend older than this frontend. */
  status?: RunningAppStatus | null;
  /** When the app was last restarted without a deploy. */
  restartedAt?: string | null;
  /** Whether this Studio environment may restart the app, once it is not `updating`. */
  canRestart?: boolean;
}

/**
 * Whether the app was restarted after it was last published, so that the restart is the latest change to what runs.
 * A deploy and a restart both make the app `updating`, and this tells them apart.
 */
export const wasRestartedAfterPublish = (
  runningApp: RunningApp | undefined,
  lastPublishedDate?: string,
): boolean => {
  const restartedAt = runningApp?.restartedAt;
  return (
    !!restartedAt && (!lastPublishedDate || new Date(restartedAt) > new Date(lastPublishedDate))
  );
};
