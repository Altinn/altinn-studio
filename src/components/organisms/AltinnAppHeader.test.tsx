import React from 'react';

import { act, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { appMetadataMock } from 'src/__mocks__/applicationMetadataMock';
import { getInitialStateMock } from 'src/__mocks__/initialStateMock';
import { AltinnAppHeader } from 'src/components/organisms/AltinnAppHeader';
import { renderWithProviders } from 'src/test/renderWithProviders';
import type { IApplicationMetadata } from 'src/features/applicationMetadata';
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

  interface IRenderComponentProps {
    party: IParty;
    user?: IParty;
    logo?: IApplicationMetadata['logo'];
  }
  const renderComponent = ({ party, user = partyPerson, logo }: IRenderComponentProps) =>
    renderWithProviders(
      <AltinnAppHeader
        party={party}
        userParty={user}
        logoColor={logoColor}
        headerBackgroundColor={headerBackgroundColor}
      />,
      {
        preloadedState: getInitialStateMock({
          applicationMetadata: appMetadataMock({ logo }),
        }),
      },
    );

  it('should render private icon when party is person', () => {
    renderComponent({ party: partyPerson });
    const profileButton = screen.getByRole('button', {
      name: /Profil ikon knapp/i,
    });
    // eslint-disable-next-line testing-library/no-node-access
    expect(profileButton.firstChild?.firstChild).toHaveClass('fa-private-circle-big');
  });

  it('should render private icon for user without ssn or org number', () => {
    renderComponent({ party: selfIdentifiedUser });
    const profileButton = screen.getByRole('button', {
      name: /Profil ikon knapp/i,
    });
    // eslint-disable-next-line testing-library/no-node-access
    expect(profileButton.firstChild?.firstChild).toHaveClass('fa-private-circle-big');
  });

  it('should render org icon when party is org', () => {
    renderComponent({ party: partyOrg });
    const profileButton = screen.getByRole('button', {
      name: /Profil ikon knapp/i,
    });
    // eslint-disable-next-line testing-library/no-node-access
    expect(profileButton.firstChild?.firstChild).toHaveClass('fa-corp-circle-big');
  });

  it('should render menu with logout option when clicking profile icon', async () => {
    renderComponent({ party: partyOrg });
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

  it('Should render Altinn logo if logo options are not set', () => {
    renderComponent({ party: partyPerson });
    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://altinncdn.no/img/Altinn-logo-black.svg');
  });

  it('Should render Organisation logo if logo options are set', () => {
    renderComponent({
      party: partyPerson,
      logo: { source: 'org', displayAppOwnerNameInHeader: false },
    });
    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://altinncdn.no/orgs/mockOrg/mockOrg.png');
  });
});
