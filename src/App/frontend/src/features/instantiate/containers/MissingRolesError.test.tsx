import React from 'react';

import { screen } from '@testing-library/react';
import { vi } from 'vitest';

import { MissingRolesError } from 'src/features/instantiate/containers/MissingRolesError';
import { renderWithoutInstanceAndLayout } from 'src/test/renderWithProviders';

const accessManagementLink = /se hvem som har rollen tilgangsstyring/i;
const rolesAndRightsLink = /mer informasjon om roller og rettigheter/i;

function mockHost(host: string) {
  vi.spyOn(window, 'location', 'get').mockReturnValue({ ...window.location, host });
}

async function render() {
  await renderWithoutInstanceAndLayout({ renderer: () => <MissingRolesError /> });
}

describe('MissingRolesError', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // The host plays no part: localtest at a custom origin gets the links the settings give it
  it.each(['ttd.apps.tt02.altinn.no', 'altinn.test:18000'])('links to the configured URLs on %s', async (host) => {
    mockHost(host);
    window.altinnAppGlobalData.platformFrontendSettings.accessManagementUrl = 'https://ny.altinn.no/tilganger';
    window.altinnAppGlobalData.platformFrontendSettings.rolesAndRightsHelpUrl = 'https://ny.altinn.no/hjelp/roller';

    await render();

    expect(screen.getByRole('link', { name: accessManagementLink })).toHaveAttribute(
      'href',
      'https://ny.altinn.no/tilganger',
    );
    expect(screen.getByRole('link', { name: rolesAndRightsLink })).toHaveAttribute(
      'href',
      'https://ny.altinn.no/hjelp/roller',
    );
  });

  // A Studio preview or any other host the platform does not run the app on gets no settings
  it('renders without the links when no URL is configured', async () => {
    window.altinnAppGlobalData.platformFrontendSettings.accessManagementUrl = undefined;
    window.altinnAppGlobalData.platformFrontendSettings.rolesAndRightsHelpUrl = undefined;

    await render();

    expect(screen.getByText(/kontakte oss på brukerservice/i)).toBeInTheDocument();
    expect(screen.queryByText(accessManagementLink)).not.toBeInTheDocument();
    expect(screen.queryByText(rolesAndRightsLink)).not.toBeInTheDocument();
  });

  // The texts take the whole URL as {0} now. That is safe for apps overriding them, because
  // parameters are only substituted into the built-in texts, never into an app's own.
  it('shows an app text overriding the link as it is', async () => {
    window.altinnAppGlobalData.textResources!.resources = [
      {
        id: 'instantiate.authorization_error_check_rights',
        value: '<a href="https://am.ui.{0}/accessmanagement/ui">Egen lenke</a>',
      },
    ];

    await render();

    expect(screen.getByRole('link', { name: 'Egen lenke' })).toHaveAttribute(
      'href',
      'https://am.ui.{0}/accessmanagement/ui',
    );
  });
});
