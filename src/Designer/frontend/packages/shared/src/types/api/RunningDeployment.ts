/** The deployment of an app that runs in an environment. */
export interface RunningDeployment {
  envName: string;
  version: string;
  /** Null when another Studio environment deployed the app, or it has not been deployed since this was recorded. */
  buildId?: string | null;
}
