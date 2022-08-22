import React from 'react';
import { AltinnAppHeader } from '..';
import type { IParty } from '../../types';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

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
    childParties: null,
    isDeleted: false,
    name: 'uidp_brxzt8pt992',
    onlyHierarchyElementWithNoAccess: false,
    orgNumber: '',
    organization: null,
    partyId: '52057791',
    partyTypeName: 3,
    person: null,
    ssn: '',
    unitType: null,
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
    expect(profileButton.firstChild.firstChild).toHaveClass(
      'fa-private-circle-big',
    );
  });

  it('should render private icon for user without ssn or org number', () => {
    renderComponent(selfIdentifiedUser);
    const profileButton = screen.getByRole('button', {
      name: /profilikon meny/i,
    });
    expect(profileButton.firstChild.firstChild).toHaveClass(
      'fa-private-circle-big',
    );
  });

  it('should render org icon when party is org', () => {
    renderComponent(partyOrg);
    const profileButton = screen.getByRole('button', {
      name: /profilikon meny/i,
    });
    expect(profileButton.firstChild.firstChild).toHaveClass(
      'fa-corp-circle-big',
    );
  });

  it('should render menu with logout option when clicking profile icon', async () => {
    renderComponent(partyOrg);
    expect(
      screen.queryByRole('link', {
        name: /logg ut/i,
        hidden: true,
      }),
    ).toBeNull();
    await userEvent.click(
      screen.getByRole('button', {
        name: /profilikon meny/i,
      }),
    );
    expect(
      screen.getByRole('link', {
        name: /logg ut/i,
        hidden: true,
      }),
    ).toBeInTheDocument();
  });
});
