import React from 'react';

import { screen } from '@testing-library/react';

import { getOrganisationMock } from 'src/__mocks__/getOrganisationMock';
import { getProfileMock } from 'src/__mocks__/getProfileMock';
import { InstantiateHeader } from 'src/features/instantiate/instantiateHeader/InstantiateHeader';
import { expectConfiguredPlatformLink, expectNotConfiguredPlatformLink } from 'src/test/platformLink';
import { renderWithoutInstanceAndLayout } from 'src/test/renderWithProviders';
import type { InstantiateHeaderProps } from 'src/features/instantiate/instantiateHeader/InstantiateHeader';

describe('InstantiateHeader', () => {
  it('should not show organization name when profile has party, and party has organization with name', async () => {
    const profile = getProfileMock();
    const org = getOrganisationMock();
    profile.party!.organization = org;

    await render({
      profile,
    });

    expect(screen.queryByText(`for ${org.name.toUpperCase()}`)).not.toBeInTheDocument();
  });

  it('should render links to inbox, schemas and profile when profile has "party" property', async () => {
    const profile = getProfileMock();
    await render({
      profile,
    });

    expect(screen.getByRole('link', { name: /innboks/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /alle skjema/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /profil/i })).toBeInTheDocument();
  });

  it('links inbox, all forms and profile to the configured URLs', async () => {
    await render();

    expectConfiguredPlatformLink(
      screen.getByRole('link', { name: /innboks/i }),
      'https://am.ui.tt02.altinn.no/accessmanagement/api/v1/reportee/changeandredirect?partyId=12345&goTo=https%3A%2F%2Faf.tt02.altinn.no%2F',
    );
    expectConfiguredPlatformLink(
      screen.getByRole('link', { name: /alle skjema/i }),
      'https://tt02.altinn.no/skjemaoversikt',
    );
    expectConfiguredPlatformLink(screen.getByRole('link', { name: /profil/i }), 'https://af.tt02.altinn.no/profile');
  });

  it('shows inbox, all forms and profile as not configured when their URLs are not configured', async () => {
    window.altinnAppGlobalData.platformFrontendSettings.arbeidsflateInboxUrl = undefined;
    window.altinnAppGlobalData.platformFrontendSettings.allFormsUrl = undefined;
    window.altinnAppGlobalData.platformFrontendSettings.arbeidsflateProfileUrl = undefined;

    await render();

    expectNotConfiguredPlatformLink(screen.getByRole('link', { name: /innboks/i }), 'ArbeidsflateInboxUrl');
    expectNotConfiguredPlatformLink(screen.getByRole('link', { name: /alle skjema/i }), 'AllFormsUrl');
    expectNotConfiguredPlatformLink(screen.getByRole('link', { name: /profil/i }), 'ArbeidsflateProfileUrl');
  });

  it('should not render links to inbox, schemas and profile when profile does not have "party" property', async () => {
    const profile = getProfileMock();
    delete profile.party;
    await render({
      profile,
    });

    expect(screen.queryByRole('link', { name: /innboks/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /alle skjema/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /profil/i })).not.toBeInTheDocument();
  });
});

const render = async (props: Partial<InstantiateHeaderProps> = {}) => {
  const profile = getProfileMock();

  const allProps = {
    profile,
    ...props,
  };

  await renderWithoutInstanceAndLayout({
    renderer: () => <InstantiateHeader {...allProps} />,
  });
};
