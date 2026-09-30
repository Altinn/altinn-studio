import { getDefaultAppStatus } from './utils';
import type { PipelineDeployment } from 'app-shared/types/api/PipelineDeployment';
import type { AppStatus } from 'app-shared/types/AppStatus';

const createDeployment = (
  deploymentType: PipelineDeployment['deploymentType'],
  appStatus?: AppStatus,
): PipelineDeployment => ({
  id: '1',
  deploymentType,
  tagName: '1.0.0',
  app: 'app',
  org: 'org',
  envName: 'tt02',
  appStatus,
  createdBy: 'user',
  created: '2026-09-30T10:00:00Z',
  events: [],
});

describe('getDefaultAppStatus', () => {
  it.each([
    [false, 'UnderDevelopment'],
    [true, 'Completed'],
  ])(
    'returns the environment default when there are no deployments (isProduction: %s)',
    (isProduction, expected) => {
      expect(getDefaultAppStatus([], isProduction)).toBe(expected);
    },
  );

  it('returns the app status of the latest deploy', () => {
    const deployments = [
      createDeployment('Deploy', 'Completed'),
      createDeployment('Deploy', 'UnderDevelopment'),
    ];
    expect(getDefaultAppStatus(deployments, false)).toBe('Completed');
  });

  it('ignores undeploys when finding the latest deploy', () => {
    const deployments = [
      createDeployment('Decommission', 'Deprecated'),
      createDeployment('Deploy', 'UnderDevelopment'),
    ];
    expect(getDefaultAppStatus(deployments, true)).toBe('UnderDevelopment');
  });

  it('returns the environment default when the latest deploy has no app status', () => {
    const deployments = [
      createDeployment('Deploy'),
      createDeployment('Deploy', 'UnderDevelopment'),
    ];
    expect(getDefaultAppStatus(deployments, true)).toBe('Completed');
  });
});
