import { describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import type { AxiosStatic } from 'axios';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { createApiErrorMock } from 'app-shared/mocks/apiErrorMock';
import { ServerCodes } from 'app-shared/enums/ServerCodes';
import { ServiceOwners } from './ServiceOwners';
import { platformMetricsMock } from 'admin/features/platform/testing/platformMetricsMock';
import {
  defaultPlatformContext,
  renderPlatformPage,
} from 'admin/features/platform/testing/renderPlatformPage';

vi.mock('axios', async () => {
  const actual = await vi.importActual<{ default: AxiosStatic }>('axios');
  return { ...actual, default: { ...actual.default, get: vi.fn() } };
});

const { environment, periodDays } = defaultPlatformContext;

describe('ServiceOwners', () => {
  it('shows the summary and one row per service owner, most apps first', () => {
    const queryClient = createQueryClientMock();
    queryClient.setQueryData(
      [QueryKey.PlatformAppDailyMetrics, environment, periodDays],
      platformMetricsMock,
    );

    renderPlatformPage(<ServiceOwners />, queryClient);

    expect(
      screen.getByText(textMock('admin.platform.summary.service_owners_active', { count: 2 })),
    ).toBeInTheDocument();
    expect(
      screen.getByText(textMock('admin.platform.summary.apps_in_use', { count: 2 })),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        textMock('admin.platform.summary.created_change', { change: '▲ 2', days: periodDays }),
      ),
    ).toBeInTheDocument();
    const links = screen.getAllByRole('link');
    expect(links[0]).toHaveTextContent('skd');
    expect(links[0]).toHaveAttribute('href', '/skd/apps');
    expect(links[1]).toHaveTextContent('ttd');
    expect(screen.getByText('4 000')).toBeInTheDocument();
  });

  it('tells the user when the platform pages are not for them', async () => {
    (axios.get as Mock).mockRejectedValue(createApiErrorMock(ServerCodes.Forbidden));

    renderPlatformPage(<ServiceOwners />);

    await waitFor(() => {
      expect(screen.getByText(textMock('admin.platform.missing_rights'))).toBeInTheDocument();
    });
  });

  it('shows an error when the numbers cannot be fetched', async () => {
    (axios.get as Mock).mockRejectedValue(createApiErrorMock(ServerCodes.InternalServerError));

    renderPlatformPage(<ServiceOwners />);

    await waitFor(() => {
      expect(screen.getByText(textMock('admin.platform.metrics.error'))).toBeInTheDocument();
    });
  });
});
