import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { QueryClient } from '@tanstack/react-query';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { InstanceDataView } from './InstanceDataView';
import type { InstanceDataViewSection } from './InstanceDataView';
import { renderWithProviders } from '../../../../../testing/mocks';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { SimpleInstanceDetails } from 'admin/features/apps/types/SimpleInstanceDetails';
import type { ApplicationMetadata } from 'app-shared/types/ApplicationMetadata';
import type { WorkflowCollectionListResponse } from 'admin/features/apps/types/workflows/WorkflowCollection';
import type { WorkflowStatus } from 'admin/features/apps/types/workflows/WorkflowStatus';
import { workflowCounts } from 'admin/testing/workflowCounts';

const org = 'ttd';
const environment = 'tt02';
const app = 'test-app';
const instanceId = '51e58b12-6de1-4d0f-9052-ec2ee9d43adf';

const instanceMock: SimpleInstanceDetails = {
  id: instanceId,
  org,
  app,
  isRead: true,
  createdAt: '2026-08-01T12:00:00Z',
  lastChangedAt: '2026-08-02T12:00:00Z',
};

const appMetadataMock: ApplicationMetadata = {
  id: `${org}/${app}`,
  org,
};

describe('InstanceDataView', () => {
  it('shows a spinner while loading', () => {
    const pending = () => new Promise(() => {});

    renderInstanceDataView({
      instance: null,
      queries: {
        getAppInstanceDetails: vi.fn().mockImplementation(pending),
        getRunningAppMetadata: vi.fn().mockImplementation(pending),
        getProcessMetadata: vi.fn().mockImplementation(pending),
      },
    });

    expect(screen.getByRole('img', { name: textMock('general.loading') })).toBeInTheDocument();
  });

  it('renders the data elements as their own card, without the delete button', () => {
    renderInstanceDataView({ section: 'dataElements' });

    expect(screen.getByText(textMock('admin.instances.data_elements'))).toBeInTheDocument();
    expect(screen.queryByText(textMock('admin.instances.info.title'))).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: textMock('general.delete') }),
    ).not.toBeInTheDocument();
  });

  it('renders an enabled delete button when the instance is not soft-deleted', () => {
    renderInstanceDataView();

    expect(getDeleteButton()).toBeEnabled();
  });

  it('disables the delete button when the instance is soft-deleted', () => {
    renderInstanceDataView({
      instance: { ...instanceMock, softDeletedAt: '2026-08-03T12:00:00Z' },
    });

    expect(getDeleteButton()).toBeDisabled();
  });

  it('deletes the instance and invalidates instance queries when the user confirms', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const deleteAppInstance = vi.fn().mockResolvedValue(undefined);
    const queryClient = createQueryClientMock();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');
    renderInstanceDataView({ queryClient, queries: { deleteAppInstance } });

    await user.click(getDeleteButton());

    expect(window.confirm).toHaveBeenCalledWith(textMock('admin.instances.delete.confirm'));
    await waitFor(() => {
      expect(deleteAppInstance).toHaveBeenCalledWith(org, environment, app, instanceId);
    });
    await waitFor(() => {
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: [QueryKey.AppInstanceDetails, org, environment, app, instanceId],
      });
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: [QueryKey.AppInstances, org, environment, app],
    });
  });

  it('disables the delete button while the deletion is pending so only one request is sent', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const deleteAppInstance = vi.fn().mockReturnValue(new Promise(() => {}));
    renderInstanceDataView({ queries: { deleteAppInstance } });

    await user.click(getDeleteButton());
    expect(getDeleteButton()).toBeDisabled();
    await user.click(getDeleteButton());

    expect(deleteAppInstance).toHaveBeenCalledTimes(1);
  });

  it("shows the instance's health on the workflow engine only when asked to", () => {
    renderInstanceDataView({ showWorkflowHealth: true });
    expect(screen.getByText(textMock('admin.workflows.health'))).toBeInTheDocument();
  });

  it("rests the instance's health on the engine's rollup, not on the workflows loaded so far", async () => {
    // The newest page of workflows is all completed, and an older auxiliary workflow failed.
    const rollup: WorkflowCollectionListResponse = {
      data: [
        {
          key: instanceId,
          namespace: `${org}/${app}`,
          createdAt: '2026-10-01T10:00:00Z',
          workflowCounts: workflowCounts({ total: 26, auxiliary: { failed: 1 } }),
        },
      ],
      pageSize: 1,
      totalCount: 1,
      unmatchedKeys: [],
    };
    const newestWorkflows = { data: [completedWorkflow], pageSize: 25, totalCount: 26 };
    renderInstanceDataView({
      showWorkflowHealth: true,
      queries: {
        getWorkflowCollections: vi.fn().mockResolvedValue(rollup),
        getWorkflows: vi.fn().mockResolvedValue(newestWorkflows),
      },
    });

    expect(
      await screen.findByText(textMock('admin.workflows.health.auxiliary_workflow_failed')),
    ).toBeInTheDocument();
  });

  it('leaves the workflow engine out of the info card, and unasked, by default', () => {
    const getWorkflowCollections = vi.fn();
    const getWorkflows = vi.fn();
    renderInstanceDataView({ queries: { getWorkflowCollections, getWorkflows } });

    expect(screen.queryByText(textMock('admin.workflows.health'))).not.toBeInTheDocument();
    expect(getWorkflowCollections).not.toHaveBeenCalled();
    expect(getWorkflows).not.toHaveBeenCalled();
  });

  it('does not delete the instance when the user cancels the confirmation', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const deleteAppInstance = vi.fn();
    renderInstanceDataView({ queries: { deleteAppInstance } });

    await user.click(getDeleteButton());

    expect(deleteAppInstance).not.toHaveBeenCalled();
  });
});

const completedWorkflow: WorkflowStatus = {
  databaseId: 'newest',
  collectionKey: instanceId,
  operationId: 'Process next',
  idempotencyKey: 'newest',
  namespace: `${org}/${app}`,
  createdAt: '2026-10-02T10:00:00Z',
  overallStatus: 'Completed',
  role: 'Primary',
  steps: [],
};

const getDeleteButton = () => screen.getByRole('button', { name: textMock('general.delete') });

type RenderInstanceDataViewOptions = {
  instance?: SimpleInstanceDetails | null;
  queryClient?: QueryClient;
  section?: InstanceDataViewSection;
  showWorkflowHealth?: boolean;
  queries?: Partial<ServicesContextProps>;
};

function renderInstanceDataView({
  instance = instanceMock,
  queryClient = createQueryClientMock(),
  section = 'info',
  showWorkflowHealth,
  queries,
}: RenderInstanceDataViewOptions = {}) {
  if (instance) {
    queryClient.setQueryData(
      [QueryKey.AppInstanceDetails, org, environment, app, instanceId],
      instance,
    );
    queryClient.setQueryData([QueryKey.AppMetadata, org, environment, app], appMetadataMock);
    queryClient.setQueryData([QueryKey.AppProcessMetadata, org, environment, app], []);
  }
  return renderWithProviders(
    <InstanceDataView
      org={org}
      environment={environment}
      app={app}
      id={instanceId}
      section={section}
      showWorkflowHealth={showWorkflowHealth}
    />,
    { queryClient, queries },
  );
}
