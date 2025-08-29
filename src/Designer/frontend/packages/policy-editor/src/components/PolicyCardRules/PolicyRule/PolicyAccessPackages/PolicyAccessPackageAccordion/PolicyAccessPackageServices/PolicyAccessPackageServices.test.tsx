import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  PolicyAccessPackageServices,
  type PolicyAccessPackageServicesProps,
} from './PolicyAccessPackageServices';
import type {
  AccessPackageResource,
  AccessPackageResourceLanguage,
} from 'app-shared/types/PolicyAccessPackages';

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
  logoUrl: 'https://altinncdn.no/orgs/skd/skd.png',
};

const defaultProps = {
  services: [resource],
  selectedLanguage: 'nb' as AccessPackageResourceLanguage,
};

describe('PolicyAccessPackageServices', () => {
  it('should show list of services', () => {
    renderPolicyAccessPackageServices();

    expect(screen.getByText(resource.title.nb)).toBeInTheDocument();
  });

  it('should show logo for services', () => {
    renderPolicyAccessPackageServices();

    expect(screen.getByAltText(resource.hasCompetentAuthority.name.nb)).toBeInTheDocument();
  });

  it('should show empty container if resource has no logo', () => {
    renderPolicyAccessPackageServices({
      services: [{ ...resource, logoUrl: '' }],
    });

    expect(screen.getByTestId('no-service-logo')).toBeInTheDocument();
  });

  it('should show orgcode if service owner name is missing', () => {
    renderPolicyAccessPackageServices({
      services: [
        { ...resource, hasCompetentAuthority: { ...resource.hasCompetentAuthority, name: null } },
      ],
    });

    expect(screen.getByText(resource.hasCompetentAuthority.orgcode)).toBeInTheDocument();
  });

  it('should show resource identifier if resource title is missing', () => {
    renderPolicyAccessPackageServices({
      services: [{ ...resource, title: null }],
    });

    expect(screen.getByText(resource.identifier)).toBeInTheDocument();
  });
});

const renderPolicyAccessPackageServices = (
  props: Partial<PolicyAccessPackageServicesProps> = {},
) => {
  render(<PolicyAccessPackageServices {...defaultProps} {...props} />);
};
