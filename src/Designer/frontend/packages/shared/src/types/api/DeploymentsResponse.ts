import type { AppInEnvironment, RunningApp } from './RunningApp';
import type { PipelineDeployment } from './PipelineDeployment';

export interface DeploymentsResponse {
  pipelineDeploymentList: PipelineDeployment[];
  /** What runs of the app in each of the org's environments. Missing from a backend older than this frontend. */
  environmentList?: AppInEnvironment[];
  /** The running apps alone, which is all a backend older than this frontend sends. */
  runningAppList?: RunningApp[];
}

/**
 * What runs of the app in each environment. A backend older than this frontend, such as during a rollout, tells only
 * where the app runs, so the other environments are left out, as they were then.
 */
export const environmentsOf = (deployments: DeploymentsResponse | undefined): AppInEnvironment[] =>
  deployments?.environmentList ??
  (deployments?.runningAppList ?? []).map((runningApp) => ({
    environment: runningApp.environment,
    state: 'running',
    runningApp,
  }));
