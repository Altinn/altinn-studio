import React from 'react';

import { expect, jest } from '@jest/globals';
import { screen } from '@testing-library/react';

import { getIncomingApplicationMetadataMock } from 'src/__mocks__/getApplicationMetadataMock';
import { OrganisationLogo } from 'src/components/presentation/OrganisationLogo/OrganisationLogo';
import { fetchApplicationMetadata } from 'src/queries/queries';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';
import type { IncomingApplicationMetadata } from 'src/features/applicationMetadata/types';

const render = async (logo: IncomingApplicationMetadata['logo']) => {
  jest.mocked(fetchApplicationMetadata).mockImplementation(async () => getIncomingApplicationMetadataMock({ logo }));

  return await renderWithInstanceAndLayout({
    renderer: () => <OrganisationLogo />,
  });
};

describe('OrganisationLogo', () => {
  it('Should get img src from organisations when logo.source is set to "org" in applicationMetadata', async () => {
    await render({
      source: 'org',
      displayAppOwnerNameInHeader: false,
    });
    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://altinncdn.no/orgs/mockOrg/mockOrg.png');
  });

  it('Should not display appOwner when "showAppOwner" is set to false', async () => {
    await render({
      source: 'org',
      displayAppOwnerNameInHeader: false,
    });

    expect(screen.queryByText('Mockdepartementet')).not.toBeInTheDocument();
  });

  it('Should display appOwner when "showAppOwner" is set to true', async () => {
    await render({
      source: 'org',
      displayAppOwnerNameInHeader: true,
    });

    expect(await screen.findByText('Mockdepartementet')).toBeInTheDocument();
  });
});
