/** Whether an app runs its latest version, and whether it answers. A deploy and a restart both make it `updating`. */
export type RunningAppStatus = 'ready' | 'updating' | 'stuck' | 'degraded' | 'unavailable';

type RunningAppProblem = { severity: 'warning' | 'danger'; textKey: string };

/** How the deploy page and the overview warn about an app that does not run as it should. A restart may help each. */
export const runningAppProblems: Partial<Record<RunningAppStatus, RunningAppProblem>> = {
  // New instances fail to start, but the app answers as before.
  stuck: { severity: 'warning', textKey: 'app_deployment.status.stuck' },
  // Some instances fail, but the others answer.
  degraded: { severity: 'warning', textKey: 'app_deployment.status.degraded' },
  unavailable: { severity: 'danger', textKey: 'app_deployment.status.not_responding' },
};

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
 * A deploy and a restart both make the app `updating`, and this tells them apart. Without the publish date, such as
 * for a deploy from another Studio environment, a restart cannot be told to be the later one.
 */
export const wasRestartedAfterPublish = (
  runningApp: RunningApp | undefined,
  lastPublishedDate?: string,
): boolean => {
  const restartedAt = runningApp?.restartedAt;
  return (
    !!restartedAt && !!lastPublishedDate && new Date(restartedAt) > new Date(lastPublishedDate)
  );
};
