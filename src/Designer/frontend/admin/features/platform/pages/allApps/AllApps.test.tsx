import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { AllApps } from './AllApps';
import { platformMetricsMock } from 'admin/features/platform/testing/platformMetricsMock';
import {
  defaultPlatformContext,
  renderPlatformPage,
} from 'admin/features/platform/testing/renderPlatformPage';

const { environment, periodDays } = defaultPlatformContext;

const renderAllApps = () => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData(
    [QueryKey.PlatformAppDailyMetrics, environment, periodDays],
    platformMetricsMock,
  );
  return renderPlatformPage(<AllApps />, queryClient);
};

describe('AllApps', () => {
  it('lists every app across service owners, the ones without use first', () => {
    renderAllApps();

    expect(
      screen.getByText(textMock('admin.platform.all_apps.status_all', { count: 3 })),
    ).toBeInTheDocument();
    const links = screen.getAllByRole('link');
    expect(links[0]).toHaveTextContent('gammel-pilot');
    expect(links[0]).toHaveAttribute('href', '/skd/apps/production/gammel-pilot');
    expect(
      screen.getByText(textMock('admin.apps.deviations.no_use', { months: 8 })),
    ).toBeInTheDocument();
  });

  it('filters to apps without use with the chip', async () => {
    const user = userEvent.setup();
    renderAllApps();

    await user.click(
      screen.getByRole('checkbox', {
        name: textMock('admin.platform.all_apps.filter_without_use', { count: 1 }),
      }),
    );

    expect(
      screen.getByText(textMock('admin.platform.all_apps.status_filtered', { count: 1 })),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });

  it('searches on service owner and app', async () => {
    const user = userEvent.setup();
    renderAllApps();

    await user.type(
      screen.getByRole('searchbox', { name: textMock('admin.platform.all_apps.search') }),
      'ttd',
    );

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveTextContent('skjema-for-byggesoknad');
  });
});
