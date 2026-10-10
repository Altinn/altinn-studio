import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import type { AxiosStatic } from 'axios';
import type { QueryClient } from '@tanstack/react-query';
import { InstanceDataView } from './InstanceDataView';
import type { InstanceDataViewSection } from './InstanceDataView';
import { renderWithProviders } from '../../../../../testing/mocks';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { instanceDeletePath } from 'admin/features/apps/utils/apiPaths';
import type { SimpleInstanceDetails } from 'admin/features/apps/types/SimpleInstanceDetails';
import type { ApplicationMetadata } from 'app-shared/types/ApplicationMetadata';

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

describe('InstanceDataView', () => {
  afterEach(vi.clearAllMocks);

  it('shows a spinner while loading', () => {
    (axios.get as Mock).mockReturnValue(new Promise(() => {}));

    renderInstanceDataView({ instance: null });

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

  it("shows the instance's health on the workflow engine only when asked to", () => {
    renderInstanceDataView({ showWorkflowHealth: true });
    expect(screen.getByText(textMock('admin.workflows.health'))).toBeInTheDocument();
  });

  it('leaves the workflow engine out of the info card, and unasked, by default', () => {
    renderInstanceDataView();

    expect(screen.queryByText(textMock('admin.workflows.health'))).not.toBeInTheDocument();
    expect(axios.get).not.toHaveBeenCalled();
  });

  it('does not delete the instance when the user cancels the confirmation', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderInstanceDataView();

    await user.click(getDeleteButton());

    expect(axios.delete).not.toHaveBeenCalled();
  });
});

const getDeleteButton = () => screen.getByRole('button', { name: textMock('general.delete') });

type RenderInstanceDataViewOptions = {
  instance?: SimpleInstanceDetails | null;
  queryClient?: QueryClient;
  section?: InstanceDataViewSection;
  showWorkflowHealth?: boolean;
};

function renderInstanceDataView({
  instance = instanceMock,
  queryClient = createQueryClientMock(),
  section = 'info',
  showWorkflowHealth,
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
    { queryClient },
  );
}
