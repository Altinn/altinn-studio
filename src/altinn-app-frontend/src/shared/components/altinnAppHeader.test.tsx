import React from 'react';

import { screen } from '@testing-library/react';

import Header from 'src/shared/components/altinnAppHeader';
import type { IHeaderProps } from 'src/shared/components/altinnAppHeader';

import { organisationMock } from 'altinn-app-frontend/__mocks__/organisationMock';
import { getProfileStateMock } from 'altinn-app-frontend/__mocks__/profileStateMock';
import { renderWithProviders } from 'altinn-app-frontend/testUtils';

import { getLanguageFromCode } from 'altinn-shared/language';

describe('AltinnAppHeader', () => {
  it('should show organisation name when profile has party, and party has organisation with name, and "type" is not set', () => {
    const profile = getProfileStateMock();
    profile.profile.party.organisation = organisationMock;

    render({
      profile: profile.profile,
      type: undefined,
    });

    expect(
      screen.getByText(`for ${organisationMock.name.toUpperCase()}`),
    ).toBeInTheDocument();
  });

  it('should not show organisation name when profile has party, and party has organisation with name, and "type" is set', () => {
    const profile = getProfileStateMock();
    profile.profile.party.organisation = organisationMock;

    render({
      profile: profile.profile,
      type: 'partyChoice',
    });

    expect(
      screen.queryByText(`for ${organisationMock.name.toUpperCase()}`),
    ).not.toBeInTheDocument();
  });

  it('should render links to inbox, schemas and profile when "type" is set and profile has "party" property', () => {
    const profile = getProfileStateMock();
    render({
      profile: profile.profile,
      type: 'partyChoice',
    });

    expect(screen.getByRole('link', { name: /innboks/i })).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /alle skjema/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /profil/i })).toBeInTheDocument();
  });

  it('should not render links to inbox, schemas and profile when "type" is not set', () => {
    render({ type: undefined });

    expect(
      screen.queryByRole('link', { name: /innboks/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /alle skjema/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /profil/i }),
    ).not.toBeInTheDocument();
  });

  it('should not render links to inbox, schemas and profile when "type" is set but profile does not have "party" property', () => {
    const profile = getProfileStateMock();
    delete profile.profile.party;
    render({
      profile: profile.profile,
      type: 'partyChoice',
    });

    expect(
      screen.queryByRole('link', { name: /innboks/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /alle skjema/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /profil/i }),
    ).not.toBeInTheDocument();
  });
});

const render = (props: Partial<IHeaderProps> = {}) => {
  const profile = getProfileStateMock();
  const language = getLanguageFromCode('nb');

  const allProps = {
    language,
    profile: profile.profile,
    ...props,
  };

  renderWithProviders(<Header {...allProps} />);
};
