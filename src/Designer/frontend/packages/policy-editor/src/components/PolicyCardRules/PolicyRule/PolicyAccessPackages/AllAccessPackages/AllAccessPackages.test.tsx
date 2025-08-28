import React from 'react';
import { render, screen } from '@testing-library/react';
import { AllAccessPackages, type AllAccessPackagesProps } from './AllAccessPackages';
import type {
  PolicyAccessPackage,
  PolicyAccessPackageArea,
} from 'app-shared/types/PolicyAccessPackages';

const package1Name = 'Package Alpha Skattepenger';
const package2Name = 'Package Beta Superskatt';
const package3Name = 'Package Gamma';
const package1: PolicyAccessPackage = {
  id: 'package1',
  urn: 'urn:package1',
  name: package1Name,
  description: 'First package',
  isDelegable: true,
};
const package2: PolicyAccessPackage = {
  id: 'package2',
  urn: 'urn:package2',
  name: package2Name,
  description: 'Second package',
  isDelegable: true,
};
const package3: PolicyAccessPackage = {
  id: 'package3',
  urn: 'urn:package3',
  name: 'Package Gamma',
  description: 'Third package',
  isDelegable: true,
};

const area1Name = 'Area 1';
const area2Name = 'Area 2';
const groupedAccessPackagesByArea: PolicyAccessPackageArea[] = [
  {
    id: 'area1',
    name: area1Name,
    urn: 'urn:area1',
    description: '',
    icon: 'skatt_avgift_regnskap_og_toll',
    packages: [package1, package2],
  },
  {
    id: 'area2',
    name: area2Name,
    urn: 'urn:area2',
    description: '',
    icon: '',
    packages: [package3],
  },
];

const defaultProps = {
  chosenAccessPackages: [],
  accessPackagesToRender: groupedAccessPackagesByArea,
  searchValue: '',
  handleSelectAccessPackage: jest.fn(),
};

describe('AllAccessPackages', () => {
  it('should render each package with search hits when searching', () => {
    renderAllAccessPackages({ searchValue: 'skatt' });

    expect(screen.getByText(package1Name)).toBeInTheDocument();
    expect(screen.getByText(package2Name)).toBeInTheDocument();
  });

  it('should not render any access packages when not expanded', () => {
    renderAllAccessPackages();

    expect(screen.queryByText(package1Name)).not.toBeInTheDocument();
    expect(screen.queryByText(package2Name)).not.toBeInTheDocument();
    expect(screen.queryByText(package3Name)).not.toBeInTheDocument();
  });

  it('should render PolicyAccordion components for each area', () => {
    renderAllAccessPackages();

    expect(screen.getByText(area1Name)).toBeInTheDocument();
    expect(screen.getByText(area2Name)).toBeInTheDocument();
  });
});

const renderAllAccessPackages = (props: Partial<AllAccessPackagesProps> = {}) => {
  render(<AllAccessPackages {...defaultProps} {...props} />);
};
