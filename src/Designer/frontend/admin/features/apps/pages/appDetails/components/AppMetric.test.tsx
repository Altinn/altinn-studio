import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { AppMetric } from './AppMetric';
import type { AppMetric as Metric } from 'admin/features/apps/types/metrics/AppMetric';
import type { AppDeploymentEvent } from 'admin/features/apps/types/AppDeploymentEvent';

vi.mock('react-chartjs-2', () => ({ Bar: () => <div data-testid='chart' /> }));

const now = Date.now();
const hour = 60 * 60 * 1000;
const metric: Metric = {
  name: 'altinn_app_lib_processes_started',
  timestamps: [now - 2 * hour, now - hour],
  counts: [3, 4],
  bucketSize: 60,
  logsUrl: '',
};

const deployment = (
  finishedAtMs: number,
  tagName: string,
  decommission = false,
): AppDeploymentEvent => ({
  tagName,
  deploymentType: decommission ? 'decommission' : 'deploy',
  finishedAt: new Date(finishedAtMs).toISOString(),
  createdBy: 'kari.nordmann',
});

describe('AppMetric', () => {
  it('lists the deployments that fall inside the chart, and marks an undeploy', () => {
    renderAppMetric([
      deployment(now - 90 * 60 * 1000, 'v14.1.0'),
      deployment(now - 30 * 60 * 1000, 'v14.2.0', true),
      deployment(now - 10 * hour, 'v13.0.0'),
    ]);

    const list = screen.getByRole('list', { name: textMock('admin.metrics.deployments') });
    expect(list).toHaveTextContent('v14.1.0');
    expect(list).toHaveTextContent(textMock('admin.metrics.deployments.undeploy'));
    expect(list).not.toHaveTextContent('v13.0.0');
    expect(list).toHaveTextContent('kari.nordmann');
  });

  it('renders no list without deployments in the range', () => {
    renderAppMetric([]);

    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(screen.getByTestId('chart')).toBeInTheDocument();
  });
});

const renderAppMetric = (deployments: AppDeploymentEvent[]) =>
  render(<AppMetric metric={metric} range={180} deployments={deployments} />);
