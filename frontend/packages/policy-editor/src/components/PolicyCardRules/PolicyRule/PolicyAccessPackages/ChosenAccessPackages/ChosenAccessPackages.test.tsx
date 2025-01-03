import React from 'react';
import { render, screen } from '@testing-library/react';
import { ChosenAccessPackages, type ChosenAccessPackagesProps } from './ChosenAccessPackages';
import type {
  PolicyAccessPackage,
  PolicyAccessPackageArea,
} from 'app-shared/types/PolicyAccessPackages';

const package1: PolicyAccessPackage = {
  id: 'package1',
  urn: 'urn:package1',
  name: 'Package Alpha',
  description: 'First package',
};
const package2: PolicyAccessPackage = {
  id: 'package2',
  urn: 'urn:package2',
  name: 'Package Beta',
  description: 'Second package',
};
const package3: PolicyAccessPackage = {
  id: 'package3',
  urn: 'urn:package3',
  name: 'Package Gamma',
  description: 'Third package',
};

const groupedAccessPackagesByArea: PolicyAccessPackageArea[] = [
  {
    id: 'area1',
    name: 'Area 1',
    urn: 'urn:area1',
    description: '',
    icon: '',
    areaGroup: '',
    packages: [package1, package2],
  },
  {
    id: 'area2',
    name: 'Area 2',
    urn: 'urn:area2',
    description: '',
    icon: '',
    areaGroup: '',
    packages: [package3],
  },
];

const defaultProps = {
  chosenAccessPackages: [],
  groupedAccessPackagesByArea: groupedAccessPackagesByArea,
  handleSelectAccessPackage: jest.fn(),
};

describe('ChosenAccessPackages', () => {
  it('should render chosen access packages when chosen access packages is not empty', () => {
    const chosenAccessPackages = [package1.urn, package3.urn];

    renderChosenAccessPackages({ chosenAccessPackages });

    expect(screen.getByText(package1.name)).toBeInTheDocument();
    expect(screen.getByText(package3.name)).toBeInTheDocument();
  });

  it('should render null when chosen access packages is empty', () => {
    renderChosenAccessPackages();

    expect(
      screen.queryByText('policy_editor.access_package_chosen_packages'),
    ).not.toBeInTheDocument();
  });
});

const renderChosenAccessPackages = (props: Partial<ChosenAccessPackagesProps> = {}) => {
  render(<ChosenAccessPackages {...defaultProps} {...props} />);
};
