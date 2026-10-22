import { describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import type { AxiosStatic } from 'axios';
import type { QueryClient } from '@tanstack/react-query';
import { InstanceDataView } from './InstanceDataView';
import { renderWithProviders } from '../../../../../testing/mocks';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { instanceDeletePath } from 'admin/features/apps/utils/apiPaths';
import type { SimpleInstanceDetails } from 'admin/features/apps/types/SimpleInstanceDetails';
import type { ApplicationMetadata } from 'app-shared/types/ApplicationMetadata';
import type { ProcessTaskMetadata } from 'admin/features/apps/hooks/queries/useProcessMetadataQuery';

vi.mock('axios', async () => {
  const actual = await vi.importActual<{ default: AxiosStatic }>('axios');
  return { ...actual, default: { ...actual.default, get: vi.fn(), delete: vi.fn() } };
});

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

const dataTypeId = 'model';

const instanceWithDataMock: SimpleInstanceDetails = {
  ...instanceMock,
  data: [
    {
      id: 'bd1c7d5e-0d3f-4f6e-8a4c-2d1f0e9b7a61',
      dataType: dataTypeId,
      contentType: 'application/xml',
      size: 1000,
      locked: false,
      isRead: true,
    },
  ],
};

const processMetadataMock: ProcessTaskMetadata[] = [
  { id: 'Task_1', name: 'Utfylling', dataTypeTags: [] },
  { id: 'Task_2', dataTypeTags: [] },
];

describe('InstanceDataView', () => {
  it('shows a spinner while loading', () => {
    (axios.get as Mock).mockReturnValue(new Promise(() => {}));

    renderInstanceDataView({ instance: null });

    expect(screen.getByRole('img', { name: textMock('general.loading') })).toBeInTheDocument();
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
    (axios.delete as Mock).mockResolvedValue({});
    const queryClient = createQueryClientMock();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');
    renderInstanceDataView({ queryClient });

    await user.click(getDeleteButton());

    expect(window.confirm).toHaveBeenCalledWith(textMock('admin.instances.delete.confirm'));
    await waitFor(() => {
      expect(axios.delete).toHaveBeenCalledWith(
        instanceDeletePath(org, environment, app, instanceId),
      );
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
    (axios.delete as Mock).mockReturnValue(new Promise(() => {}));
    renderInstanceDataView();

    await user.click(getDeleteButton());
    expect(getDeleteButton()).toBeDisabled();
    await user.click(getDeleteButton());

    expect(axios.delete).toHaveBeenCalledTimes(1);
  });

  it('does not delete the instance when the user cancels the confirmation', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderInstanceDataView();

    await user.click(getDeleteButton());

    expect(axios.delete).not.toHaveBeenCalled();
  });

  it('shows the task a data type is bound to with taskId', () => {
    renderInstanceDataView({
      instance: instanceWithDataMock,
      appMetadata: { ...appMetadataMock, dataTypes: [{ id: dataTypeId, taskId: 'Task_1' }] },
      processMetadata: processMetadataMock,
    });

    expect(screen.getByText('Utfylling')).toBeInTheDocument();
  });

  it('shows every task a data type is bound to with taskIds, by name where the task has one', () => {
    renderInstanceDataView({
      instance: instanceWithDataMock,
      appMetadata: {
        ...appMetadataMock,
        dataTypes: [{ id: dataTypeId, taskIds: ['Task_1', 'Task_2'] }],
      },
      processMetadata: processMetadataMock,
    });

    expect(screen.getByText('Utfylling')).toBeInTheDocument();
    expect(screen.getByText('Task_2')).toBeInTheDocument();
  });

  it('shows the task whose configuration names a data type that is bound to no task', () => {
    renderInstanceDataView({
      instance: instanceWithDataMock,
      appMetadata: { ...appMetadataMock, dataTypes: [{ id: dataTypeId }] },
      processMetadata: [
        processMetadataMock[0],
        { id: 'Task_2', dataTypeTags: [{ dataTypeId, tag: 'signatureDataType' }] },
      ],
    });

    expect(screen.getByText('Task_2')).toBeInTheDocument();
    expect(screen.queryByText('Utfylling')).not.toBeInTheDocument();
  });

  it('shows no task when taskIds is empty, even when taskId is set', () => {
    renderInstanceDataView({
      instance: instanceWithDataMock,
      appMetadata: {
        ...appMetadataMock,
        dataTypes: [{ id: dataTypeId, taskId: 'Task_1', taskIds: [] }],
      },
      processMetadata: processMetadataMock,
    });

    expect(screen.queryByText('Utfylling')).not.toBeInTheDocument();
  });
});

const getDeleteButton = () => screen.getByRole('button', { name: textMock('general.delete') });

type RenderInstanceDataViewOptions = {
  instance?: SimpleInstanceDetails | null;
  appMetadata?: ApplicationMetadata;
  processMetadata?: ProcessTaskMetadata[];
  queryClient?: QueryClient;
};

function renderInstanceDataView({
  instance = instanceMock,
  appMetadata = appMetadataMock,
  processMetadata = [],
  queryClient = createQueryClientMock(),
}: RenderInstanceDataViewOptions = {}) {
  if (instance) {
    queryClient.setQueryData(
      [QueryKey.AppInstanceDetails, org, environment, app, instanceId],
      instance,
    );
    queryClient.setQueryData([QueryKey.AppMetadata, org, environment, app], appMetadata);
    queryClient.setQueryData([QueryKey.AppProcessMetadata, org, environment, app], processMetadata);
  }
  return renderWithProviders(
    <InstanceDataView org={org} environment={environment} app={app} id={instanceId} />,
    { queryClient },
  );
}
