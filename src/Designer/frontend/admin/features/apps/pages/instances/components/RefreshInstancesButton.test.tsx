import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { QueryClient } from '@tanstack/react-query';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { app, org } from '@studio/testing/testids';
import { RefreshInstancesButton, type RefreshInstancesButtonProps } from './RefreshInstancesButton';

const environment = 'at23';

const defaultProps: RefreshInstancesButtonProps = { org, environment, app };

describe('RefreshInstancesButton', () => {
  it('reads the instance list, its health column and the problems list again', async () => {
    const user = userEvent.setup();
    const queryClient = createQueryClientMock();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    renderRefreshInstancesButton({ queryClient });

    await user.click(screen.getByRole('button', { name: textMock('admin.instances.refresh') }));

    await waitFor(() => expect(invalidateQueries).toHaveBeenCalledTimes(3));
    expect(invalidateQueries.mock.calls.map(([filters]) => filters?.queryKey)).toEqual([
      [QueryKey.AppInstances, org, environment, app],
      [QueryKey.AppInstancesWorkflowHealth, org, environment, app],
      [QueryKey.AppWorkflowProblems, org, environment, app],
    ]);
  });
});

type RenderRefreshInstancesButtonOptions = {
  props?: Partial<RefreshInstancesButtonProps>;
  queryClient?: QueryClient;
};

const renderRefreshInstancesButton = ({
  props = {},
  queryClient = createQueryClientMock(),
}: RenderRefreshInstancesButtonOptions = {}) =>
  render(
    <QueryClientProvider client={queryClient}>
      <RefreshInstancesButton {...defaultProps} {...props} />
    </QueryClientProvider>,
  );
