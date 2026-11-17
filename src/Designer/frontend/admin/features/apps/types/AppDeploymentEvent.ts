/** A deploy or undeploy of an app that finished. Mirrors AppDeploymentEvent in the backend. */
export type AppDeploymentEvent = {
  tagName: string;
  deploymentType: 'deploy' | 'decommission';
  /** When the pipeline finished, as an ISO timestamp. */
  finishedAt: string;
  createdBy: string;
};
