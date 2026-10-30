export interface KubernetesDeployment {
  envName: string;
  release: string;
  version: string;
  /** Null when another Studio environment deployed the app, or it has not been deployed since this was recorded. */
  buildId?: string | null;
}
