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

  it('links to the configured URLs on an Altinn host', async () => {
    mockHost('ttd.apps.tt02.altinn.no');
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

  it('links to the localtest front page in localtest', async () => {
    mockHost('local.altinn.cloud:8000');

    await render();

    expect(screen.getByRole('link', { name: accessManagementLink })).toHaveAttribute(
      'href',
      'http://local.altinn.cloud:8000/',
    );
    expect(screen.getByRole('link', { name: rolesAndRightsLink })).toHaveAttribute(
      'href',
      'http://local.altinn.cloud:8000/',
    );
  });

  // getHostname() used to throw on hosts it did not recognize, which took the whole page down
  it('renders without the links on an unknown host', async () => {
    mockHost('altinn.studio');

    await render();

    expect(screen.getByText(/kontakte oss på brukerservice/i)).toBeInTheDocument();
    expect(screen.queryByText(accessManagementLink)).not.toBeInTheDocument();
    expect(screen.queryByText(rolesAndRightsLink)).not.toBeInTheDocument();
  });

  it('hides the links when no URL is configured', async () => {
    mockHost('ttd.apps.tt02.altinn.no');
    window.altinnAppGlobalData.platformFrontendSettings.accessManagementUrl = undefined;
    window.altinnAppGlobalData.platformFrontendSettings.rolesAndRightsHelpUrl = undefined;

    await render();

    expect(screen.queryByText(accessManagementLink)).not.toBeInTheDocument();
    expect(screen.queryByText(rolesAndRightsLink)).not.toBeInTheDocument();
  });

  // The texts take the whole URL as {0} now. That is safe for apps overriding them, because
  // parameters are only substituted into the built-in texts, never into an app's own.
  it('shows an app text overriding the link as it is', async () => {
    mockHost('ttd.apps.tt02.altinn.no');
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
