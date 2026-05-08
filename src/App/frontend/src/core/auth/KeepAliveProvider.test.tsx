import React from 'react';

import { waitFor } from '@testing-library/react';

import { getApplicationMetadataMock } from 'src/__mocks__/getApplicationMetadataMock';
import { getApplicationSettingsMock } from 'src/__mocks__/getApplicationSettingsMock';
import { KeepAliveProvider } from 'src/core/auth/KeepAliveProvider';
import { renderWithoutInstanceAndLayout } from 'src/test/renderWithProviders';
import { getEnvironmentLoginUrl } from 'src/utils/urls/appUrlHelper';

const APP_URL = 'https://ttd.apps.altinn.no/ttd/test';

const resetWindowLocation = () => {
  const oldWindowLocation = window.location;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (window as any).location;
  // @ts-expect-error mocking window.location for redirect assertions
  window.location = {
    ...oldWindowLocation,
    origin: 'https://ttd.apps.altinn.no',
    pathname: '/ttd/test',
    host: 'ttd.apps.altinn.no',
    href: APP_URL,
  };
};

const renderKeepAlive = async ({
  fetchRefreshJwtToken = async () => ({}),
  stateless = false,
  allowAnonymous = false,
}: {
  fetchRefreshJwtToken?: () => Promise<unknown>;
  stateless?: boolean;
  allowAnonymous?: boolean;
} = {}) => {
  resetWindowLocation();

  window.altinnAppGlobalData.frontendSettings = getApplicationSettingsMock({
    appOidcProvider: 'idporten',
  });

  window.altinnAppGlobalData.applicationMetadata = getApplicationMetadataMock({
    onEntry: { show: stateless ? (allowAnonymous ? 'stateless-anon' : 'stateless') : 'new-instance' },
  });

  const expectedLoginUrl = getEnvironmentLoginUrl('idporten');

  const renderResult = await renderWithoutInstanceAndLayout({
    renderer: () => (
      <KeepAliveProvider>
        <div>test</div>
      </KeepAliveProvider>
    ),
    queries: { fetchRefreshJwtToken },
  });

  return { ...renderResult, expectedLoginUrl };
};

describe('KeepAliveProvider', () => {
  it('redirects to login when keepAlive fails', async () => {
    const { expectedLoginUrl } = await renderKeepAlive({
      fetchRefreshJwtToken: async () => {
        throw new Error('expired');
      },
    });

    await waitFor(() => {
      expect(window.location.href).toBe(expectedLoginUrl);
    });
  });

  it('does not redirect when keepAlive succeeds', async () => {
    const { queries } = await renderKeepAlive();

    await waitFor(() => {
      expect(queries.fetchRefreshJwtToken).toHaveBeenCalledTimes(1);
    });

    expect(window.location.href).toBe(APP_URL);
  });

  it('does not start keepAlive for allowAnonymous stateless apps', async () => {
    const { queries } = await renderKeepAlive({ stateless: true, allowAnonymous: true });

    expect(queries.fetchRefreshJwtToken).not.toHaveBeenCalled();
    expect(window.location.href).toBe(APP_URL);
  });
});
