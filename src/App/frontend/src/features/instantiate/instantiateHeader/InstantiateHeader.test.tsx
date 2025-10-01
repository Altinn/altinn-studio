import React from 'react';

import { screen } from '@testing-library/react';

import { getOrganisationMock } from 'src/__mocks__/getOrganisationMock';
import { getProfileMock } from 'src/__mocks__/getProfileMock';
import { InstantiateHeader } from 'src/features/instantiate/instantiateHeader/InstantiateHeader';
import { renderWithoutInstanceAndLayout } from 'src/test/renderWithProviders';
import type { InstantiateHeaderProps } from 'src/features/instantiate/instantiateHeader/InstantiateHeader';

describe('InstantiateHeader', () => {
  it('should not show organisation name when profile has party, and party has organisation with name', async () => {
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
