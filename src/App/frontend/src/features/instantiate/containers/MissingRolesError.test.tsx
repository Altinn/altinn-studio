import React from 'react';

import { screen } from '@testing-library/react';
import { vi } from 'vitest';

import { MissingRolesError } from 'src/features/instantiate/containers/MissingRolesError';
import { expectNotConfiguredPlatformLink } from 'src/test/platformLink';
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

  // The settings reach only apps the platform runs; where one is missing the link shows that it is not configured
  it('shows the links as not configured when no URL is configured', async () => {
    window.altinnAppGlobalData.platformFrontendSettings.accessManagementUrl = undefined;
    window.altinnAppGlobalData.platformFrontendSettings.rolesAndRightsHelpUrl = undefined;

    await render();

    expect(screen.getByText(/kontakte oss på brukerservice/i)).toBeInTheDocument();
    expectNotConfiguredPlatformLink(screen.getByRole('link', { name: accessManagementLink }), 'AccessManagementUrl');
    expectNotConfiguredPlatformLink(screen.getByRole('link', { name: rolesAndRightsLink }), 'RolesAndRightsHelpUrl');
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
