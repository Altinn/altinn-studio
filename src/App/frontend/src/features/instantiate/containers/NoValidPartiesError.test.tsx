import React from 'react';

import { screen } from '@testing-library/react';
import { vi } from 'vitest';

import { NoValidPartiesError } from 'src/features/instantiate/containers/NoValidPartiesError';
import { expectNotConfiguredPlatformLink } from 'src/test/platformLink';
import { renderWithoutInstanceAndLayout } from 'src/test/renderWithProviders';

const rolesAndRightsLink = /mer informasjon om roller og rettigheter/i;

function mockHost(host: string) {
  vi.spyOn(window, 'location', 'get').mockReturnValue({ ...window.location, host });
}

async function render() {
  await renderWithoutInstanceAndLayout({ renderer: () => <NoValidPartiesError /> });
}

describe('NoValidPartiesError', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // The host plays no part: localtest at a custom origin gets the link the settings give it
  it.each(['ttd.apps.tt02.altinn.no', 'altinn.test:18000'])('links to the configured URL on %s', async (host) => {
    mockHost(host);
    window.altinnAppGlobalData.platformFrontendSettings.rolesAndRightsHelpUrl = 'https://ny.altinn.no/hjelp/roller';

    await render();

    expect(screen.getByRole('link', { name: rolesAndRightsLink })).toHaveAttribute(
      'href',
      'https://ny.altinn.no/hjelp/roller',
    );
  });

  // The settings reach only apps the platform runs; where one is missing the link shows that it is not configured
  it('shows the link as not configured when no URL is configured', async () => {
    window.altinnAppGlobalData.platformFrontendSettings.rolesAndRightsHelpUrl = undefined;

    await render();

    expect(screen.getByText(/kontakte oss på brukerservice/i)).toBeInTheDocument();
    expectNotConfiguredPlatformLink(screen.getByRole('link', { name: rolesAndRightsLink }), 'RolesAndRightsHelpUrl');
  });
});
