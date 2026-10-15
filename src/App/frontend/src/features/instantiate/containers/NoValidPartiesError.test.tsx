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

  it('links to the configured URL on an Altinn host', async () => {
    mockHost('ttd.apps.tt02.altinn.no');
    window.altinnAppGlobalData.platformFrontendSettings.rolesAndRightsHelpUrl = 'https://ny.altinn.no/hjelp/roller';

    await render();

    expect(screen.getByRole('link', { name: rolesAndRightsLink })).toHaveAttribute(
      'href',
      'https://ny.altinn.no/hjelp/roller',
    );
  });

  it('hides the link when no URL is configured', async () => {
    mockHost('ttd.apps.tt02.altinn.no');
    window.altinnAppGlobalData.platformFrontendSettings.rolesAndRightsHelpUrl = undefined;

    await render();

    expect(screen.queryByText(rolesAndRightsLink)).not.toBeInTheDocument();
  });

  // getHostname() used to throw on hosts it did not recognize, which took the whole page down
  it('renders without the link on an unknown host', async () => {
    mockHost('altinn.studio');

    await render();

    expect(screen.getByText(/kontakte oss på brukerservice/i)).toBeInTheDocument();
    expect(screen.queryByText(rolesAndRightsLink)).not.toBeInTheDocument();
  });
});
