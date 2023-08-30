import React from 'react';

import { screen } from '@testing-library/react';

import { appMetadataMock } from 'src/__mocks__/applicationMetadataMock';
import { getInitialStateMock } from 'src/__mocks__/initialStateMock';
import { OrganisationLogo } from 'src/components/presentation/OrganisationLogo/OrganisationLogo';
import { renderWithProviders } from 'src/testUtils';
import type { IApplicationMetadata } from 'src/features/applicationMetadata';

const renderComponent = (logo: IApplicationMetadata['logo']) =>
  renderWithProviders(<OrganisationLogo />, {
    preloadedState: getInitialStateMock({
      applicationMetadata: appMetadataMock({ logo }),
    }),
  });

describe('OrganisationLogo', () => {
  it('Should get img src from organisations when logo.source is set to "org" in applicationMetadata', () => {
    renderComponent({
      source: 'org',
      displayAppOwnerNameInHeader: false,
    });
    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://altinncdn.no/orgs/mockOrg/mockOrg.png');
  });

  it('Should not display appOwner when "showAppOwner" is set to false', () => {
    renderComponent({
      source: 'org',
      displayAppOwnerNameInHeader: false,
    });

    expect(screen.queryByText('Mockdepartementet')).not.toBeInTheDocument();
  });

  it('Should display appOwner when "showAppOwner" is set to true', async () => {
    renderComponent({
      source: 'org',
      displayAppOwnerNameInHeader: true,
    });

    expect(await screen.findByText('Mockdepartementet')).toBeInTheDocument();
  });
});
