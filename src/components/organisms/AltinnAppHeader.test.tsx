import React from 'react';

import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AltinnAppHeader } from 'src/components/organisms/AltinnAppHeader';
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
  const language = {
    general: {
      header_profile_icon_label: 'Profilikon meny',
      log_out: 'Logg ut',
    },
  };

  const renderComponent = (party: IParty, user = partyPerson) =>
    render(
      <AltinnAppHeader
        party={party}
        userParty={user}
        logoColor={logoColor}
        headerBackgroundColor={headerBackgroundColor}
        language={language}
      />,
    );

  it('should render private icon when party is person', () => {
    renderComponent(partyPerson);
    const profileButton = screen.getByRole('button', {
      name: /profilikon meny/i,
    });
    expect(profileButton.firstChild?.firstChild).toHaveClass('fa-private-circle-big');
  });

  it('should render private icon for user without ssn or org number', () => {
    renderComponent(selfIdentifiedUser);
    const profileButton = screen.getByRole('button', {
      name: /profilikon meny/i,
    });
    expect(profileButton.firstChild?.firstChild).toHaveClass('fa-private-circle-big');
  });

  it('should render org icon when party is org', () => {
    renderComponent(partyOrg);
    const profileButton = screen.getByRole('button', {
      name: /profilikon meny/i,
    });
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
    await act(() =>
      userEvent.click(
        screen.getByRole('button', {
          name: /profilikon meny/i,
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
