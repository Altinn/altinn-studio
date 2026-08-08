import React from 'react';

import { screen } from '@testing-library/react';

import { getApplicationMetadataMock } from 'src/__mocks__/getApplicationMetadataMock';
import { OrganizationLogo } from 'src/components/presentation/OrganizationLogo/OrganizationLogo';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';
import type { ApplicationMetadata } from 'src/features/applicationMetadata/types';

const render = async (logo: ApplicationMetadata['logo']) => {
  window.altinnAppGlobalData.applicationMetadata = getApplicationMetadataMock({ logo });

  return await renderWithInstanceAndLayout({
    renderer: () => <OrganizationLogo />,
  });
};

describe('OrganizationLogo', () => {
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
