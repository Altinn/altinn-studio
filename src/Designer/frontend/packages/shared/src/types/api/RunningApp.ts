/** The app as it runs in an environment. */
export interface RunningApp {
  environment: string;
  /** Null when the runtime gateway could not tell the deployed tag. */
  version: string | null;
  /** The build of the deploy that runs, or null when the app has not been deployed since this was recorded. */
  buildId: string | null;
}
