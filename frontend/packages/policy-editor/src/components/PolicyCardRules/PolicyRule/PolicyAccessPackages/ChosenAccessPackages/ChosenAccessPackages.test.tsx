import React from 'react';
import { render, screen } from '@testing-library/react';
import { ChosenAccessPackages, type ChosenAccessPackagesProps } from './ChosenAccessPackages';
import type {
  PolicyAccessPackage,
  PolicyAccessPackageArea,
} from 'app-shared/types/PolicyAccessPackages';
import { textMock } from '@studio/testing/mocks/i18nMock';

const package1: PolicyAccessPackage = {
  id: 'package1',
  urn: 'urn:package1',
  name: 'Package Alpha',
  description: 'First package',
  isDelegable: true,
};
const package2: PolicyAccessPackage = {
  id: 'package2',
  urn: 'urn:package2',
  name: 'Package Beta',
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
const unknownAccessPackage: PolicyAccessPackage = {
  id: 'package4',
  urn: 'urn:package4',
  name: 'Package Zeta',
  description: 'Fourth package',
  isDelegable: true,
};

const groupedAccessPackagesByArea: PolicyAccessPackageArea[] = [
  {
    id: 'area1',
    name: 'Area 1',
    urn: 'urn:area1',
    description: '',
    icon: '',
    packages: [package1, package2],
  },
  {
    id: 'area2',
    name: 'Area 2',
    urn: 'urn:area2',
    description: '',
    icon: '',
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

  it('should render unknown access package when a chosen access package has unknown urn', () => {
    const chosenAccessPackages = [unknownAccessPackage.urn];

    renderChosenAccessPackages({ chosenAccessPackages });

    expect(
      screen.getByText(textMock('policy_editor.access_package_unknown_heading')),
    ).toBeInTheDocument();
  });
});

const renderChosenAccessPackages = (props: Partial<ChosenAccessPackagesProps> = {}) => {
  render(<ChosenAccessPackages {...defaultProps} {...props} />);
};
