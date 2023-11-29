import React from 'react';

import { act, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { getApplicationMetadataMock } from 'src/__mocks__/getApplicationMetadataMock';
import { LogoColor } from 'src/components/logo/AltinnLogo';
import { AltinnAppHeader } from 'src/components/organisms/AltinnAppHeader';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';
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

  const mockLogo = '<svg fill="black">Altinn</svg>';

  interface IRenderComponentProps {
    party: IParty;
    user?: IParty;
    logo?: IApplicationMetadata['logo'];
  }
  const render = async ({ party, user = partyPerson, logo }: IRenderComponentProps) =>
    await renderWithInstanceAndLayout({
      renderer: () => (
        <AltinnAppHeader
          party={party}
          userParty={user}
          logoColor={LogoColor.blueDarker}
          headerBackgroundColor={headerBackgroundColor}
        />
      ),
      queries: {
        fetchLogo: () => Promise.resolve(mockLogo),
        fetchApplicationMetadata: () => Promise.resolve(getApplicationMetadataMock({ logo })),
      },
    });

  it('should render private icon when party is person', async () => {
    await render({ party: partyPerson });
    const profileButton = screen.getByRole('button', {
      name: /Profil ikon knapp/i,
    });
    // eslint-disable-next-line testing-library/no-node-access
    expect(profileButton.firstChild?.firstChild).toHaveClass('fa-private-circle-big');
  });

  it('should render private icon for user without ssn or org number', async () => {
    await render({ party: selfIdentifiedUser });
    const profileButton = screen.getByRole('button', {
      name: /Profil ikon knapp/i,
    });
    // eslint-disable-next-line testing-library/no-node-access
    expect(profileButton.firstChild?.firstChild).toHaveClass('fa-private-circle-big');
  });

  it('should render org icon when party is org', async () => {
    await render({ party: partyOrg });
    const profileButton = screen.getByRole('button', {
      name: /Profil ikon knapp/i,
    });
    // eslint-disable-next-line testing-library/no-node-access
    expect(profileButton.firstChild?.firstChild).toHaveClass('fa-corp-circle-big');
  });

  it('should render menu with logout option when clicking profile icon', async () => {
    await render({ party: partyOrg });
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

  it('Should render Altinn logo if logo options are not set', async () => {
    await render({ party: partyPerson });
    expect(screen.getByRole('img')).toHaveAttribute('src', `data:image/svg+xml;utf8,${encodeURIComponent(mockLogo)}`);
  });

  it('Should render Organisation logo if logo options are set', async () => {
    await render({
      party: partyPerson,
      logo: { source: 'org', displayAppOwnerNameInHeader: false },
    });
    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://altinncdn.no/orgs/mockOrg/mockOrg.png');
  });
});
