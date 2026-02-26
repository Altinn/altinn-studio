import React from 'react';

import { expect, jest } from '@jest/globals';
import { screen } from '@testing-library/react';

import { getApplicationMetadataMock } from 'src/__mocks__/getApplicationMetadataMock';
import { OrganisationLogo } from 'src/components/presentation/OrganisationLogo/OrganisationLogo';
import { getApplicationMetadata } from 'src/features/applicationMetadata';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';
import type { ApplicationMetadata } from 'src/features/applicationMetadata/types';

const render = async (logo: ApplicationMetadata['logo']) => {
  jest.mocked(getApplicationMetadata).mockImplementation(() => getApplicationMetadataMock({ logo }));

  return await renderWithInstanceAndLayout({
    renderer: () => <OrganisationLogo />,
  });
};

describe('OrganisationLogo', () => {
  beforeEach(() => {
    window.altinnAppGlobalData.orgLogoUrl = 'https://altinncdn.no/orgs/mockOrg/mockOrg.png';
    window.altinnAppGlobalData.orgName = { nb: 'Mockdepartementet', en: 'Mock Ministry', nn: 'Mockdepartementet' };
  });

  afterEach(() => {
    window.altinnAppGlobalData.orgLogoUrl = undefined;
    window.altinnAppGlobalData.orgName = undefined;
  });

  it('Should get img src from global data when logo.source is set to "org" in applicationMetadata', async () => {
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
