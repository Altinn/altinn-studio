import React from 'react';

import { screen } from '@testing-library/react';
import { vi } from 'vitest';

import { NoValidPartiesError } from 'src/features/instantiate/containers/NoValidPartiesError';
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

  // A Studio preview or any other host the platform does not run the app on gets no settings
  it('renders without the link when no URL is configured', async () => {
    window.altinnAppGlobalData.platformFrontendSettings.rolesAndRightsHelpUrl = undefined;

    await render();

    expect(screen.getByText(/kontakte oss på brukerservice/i)).toBeInTheDocument();
    expect(screen.queryByText(rolesAndRightsLink)).not.toBeInTheDocument();
  });
});
