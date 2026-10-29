import type { ApplicationMetadata } from 'app-shared/types/ApplicationMetadata';

/** Application metadata as the running app serves it, with the version of the app libraries it runs on. */
export type RunningApplicationMetadata = ApplicationMetadata & {
  /** The version of the app libraries, as the app reports it: `8.5.1.0`, `9.0.0.175`. */
  altinnNugetVersion?: string;
};
