import React from 'react';

import { waitFor } from '@testing-library/react';

import { KeepAliveProvider } from 'src/core/auth/KeepAliveProvider';
import { renderWithMinimalProviders } from 'src/test/renderWithProviders';

describe('KeepAliveProvider', () => {
  const appUrl = 'https://ttd.apps.tt02.altinn.no/ttd/test';
  const originalLocation = window.location;

  const setLocation = (location: Partial<Location>) => {
    // jsdom refuses an assignment to window.location.href, so swap in a plain object we can read back
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).location;
    // @ts-expect-error: can be removed when this issue is fixed: https://github.com/microsoft/TypeScript/issues/61335
    window.location = { ...originalLocation, ...location };
  };

  beforeEach(() => {
    setLocation({ href: appUrl });
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    setLocation(originalLocation);
  });

  const renderWithExpiredToken = async () =>
    await renderWithMinimalProviders({
      renderer: () => <KeepAliveProvider>content</KeepAliveProvider>,
      queries: { fetchRefreshJwtToken: () => Promise.reject(new Error('token expired')) },
      waitUntilLoaded: false,
    });

  it('sends the user to the configured login url when the token can no longer be refreshed', async () => {
    await renderWithExpiredToken();

    await waitFor(() =>
      expect(window.location.href).toBe(
        `https://platform.tt02.altinn.no/authentication/api/v1/authentication?goto=${encodeURIComponent(appUrl)}`,
      ),
    );
    expect(console.error).not.toHaveBeenCalled();
  });

  // Without a login url there is nowhere to send the user, so the failure has to surface in the log
  // instead of leaving the session to die silently.
  it('logs the error instead of navigating when no login url is configured', async () => {
    window.altinnAppGlobalData.platformFrontendSettings.loginUrl = undefined;

    await renderWithExpiredToken();

    await waitFor(() => expect(console.error).toHaveBeenCalled());
    expect(window.location.href).toBe(appUrl);
  });
});
