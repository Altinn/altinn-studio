import React from 'react';

import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AltinnAppHeader } from 'src/components/organisms/AltinnAppHeader';
import { renderWithProviders } from 'src/testUtils';
import type { IParty } from 'src/types/shared';

describe('organisms/AltinnAppHeader', () => {
  const partyPerson = {
    name: 'Test Testesen',
    ssn: '01010000000',
    partyId: '12345',
  } as IParty;

  const partyOrg = {
    orgNumber: 12345678,
    partyId: '54321',
    name: 'Bedrift',
  } as IParty;

  const selfIdentifiedUser = {
    isDeleted: false,
    name: 'uidp_brxzt8pt992',
    onlyHierarchyElementWithNoAccess: false,
    orgNumber: '',
    partyId: '52057791',
    partyTypeName: 3,
    ssn: '',
  } as IParty;

  const headerBackgroundColor = 'blue';
  const logoColor = 'blue';

  const renderComponent = (party: IParty, user = partyPerson) =>
    renderWithProviders(
      <AltinnAppHeader
        party={party}
        userParty={user}
        logoColor={logoColor}
        headerBackgroundColor={headerBackgroundColor}
      />,
    );

  it('should render private icon when party is person', () => {
    renderComponent(partyPerson);
    const profileButton = screen.getByRole('button', {
      name: /Profil ikon knapp/i,
    });
    // eslint-disable-next-line testing-library/no-node-access
    expect(profileButton.firstChild?.firstChild).toHaveClass('fa-private-circle-big');
  });

  it('should render private icon for user without ssn or org number', () => {
    renderComponent(selfIdentifiedUser);
    const profileButton = screen.getByRole('button', {
      name: /Profil ikon knapp/i,
    });
    // eslint-disable-next-line testing-library/no-node-access
    expect(profileButton.firstChild?.firstChild).toHaveClass('fa-private-circle-big');
  });

  it('should render org icon when party is org', () => {
    renderComponent(partyOrg);
    const profileButton = screen.getByRole('button', {
      name: /Profil ikon knapp/i,
    });
    // eslint-disable-next-line testing-library/no-node-access
    expect(profileButton.firstChild?.firstChild).toHaveClass('fa-corp-circle-big');
  });

  it('should render menu with logout option when clicking profile icon', async () => {
    renderComponent(partyOrg);
    expect(
      screen.queryByRole('link', {
        name: /logg ut/i,
        hidden: true,
      }),
    ).toBeNull();
    // eslint-disable-next-line testing-library/no-unnecessary-act
    await act(() =>
      userEvent.click(
        screen.getByRole('button', {
          name: /Profil ikon knapp/i,
        }),
      ),
    );
    expect(
      screen.getByRole('link', {
        name: /logg ut/i,
        hidden: true,
      }),
    ).toBeInTheDocument();
  });
});
