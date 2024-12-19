import React from 'react';
import { render, screen } from '@testing-library/react';
import { PolicyAccessPackageServices } from './PolicyAccessPackageServices';
import type { AccessPackageResource } from 'app-shared/types/PolicyAccessPackages';

const resource: AccessPackageResource = {
  identifier: 'kravogbetaling',
  title: {
    nb: 'Krav og betaling',
    nn: 'Krav og betaling',
    en: 'Krav og betaling',
  },
  hasCompetentAuthority: {
    name: {
      nb: 'Skatteetaten',
      nn: 'Skatteetaten',
      en: 'Skatteetaten',
    },
    organization: '974761076',
    orgcode: 'skd',
  },
  logoUrl: '',
};

describe('PolicyAccessPackageServices', () => {
  it('should show list of services', () => {
    render(<PolicyAccessPackageServices services={[resource]} />);

    expect(screen.getByText(resource.title.nb)).toBeInTheDocument();
  });

  it('should show logo for services', () => {
    render(
      <PolicyAccessPackageServices
        services={[{ ...resource, logoUrl: 'https://altinncdn.no/orgs/skd/skd.png' }]}
      />,
    );

    expect(screen.getByAltText(resource.hasCompetentAuthority.name.nb)).toBeInTheDocument();
  });

  it('should show empty container if resource has no logo', () => {
    render(<PolicyAccessPackageServices services={[resource]} />);

    expect(screen.getByTestId('no-service-logo')).toBeInTheDocument();
  });
});
