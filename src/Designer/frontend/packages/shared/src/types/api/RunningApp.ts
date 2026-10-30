/** The app as it runs in an environment. */
export interface RunningApp {
  envName: string;
  /** Null when the runtime gateway could not tell the deployed tag. */
  version: string | null;
  /** Null when another Studio environment deployed the app, or it has not been deployed since this was recorded. */
  buildId?: string | null;
}
