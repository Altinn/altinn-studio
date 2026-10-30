/** The app as it runs in an environment. */
export interface RunningApp {
  environment: string;
  /** Null when the runtime gateway could not tell the deployed tag. */
  version: string | null;
  /** Null when the app has not been deployed since the deploy pipeline began recording which Studio deployed it. */
  deployedFromThisStudio: boolean | null;
  /** The build of this Studio's deploy that runs. Set only when `deployedFromThisStudio` is true. */
  buildId: string | null;
}
