import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { app, org } from '@studio/testing/testids';
import { RefreshInstancesButton } from './RefreshInstancesButton';

const environment = 'at23';

describe('RefreshInstancesButton', () => {
  it('reads the instance list, its health column and the problems list again', async () => {
    const user = userEvent.setup();
    const client = createQueryClientMock();
    const invalidateQueries = jest.spyOn(client, 'invalidateQueries');
    render(
      <QueryClientProvider client={client}>
        <RefreshInstancesButton org={org} environment={environment} app={app} />
      </QueryClientProvider>,
    );

    await user.click(screen.getByRole('button', { name: textMock('admin.instances.refresh') }));

    await waitFor(() => expect(invalidateQueries).toHaveBeenCalledTimes(3));
    expect(invalidateQueries.mock.calls.map(([filters]) => filters?.queryKey)).toEqual([
      [QueryKey.AppInstances, org, environment, app],
      [QueryKey.AppInstancesWorkflowHealth, org, environment, app],
      [QueryKey.AppWorkflowProblems, org, environment, app],
    ]);
  });
});
