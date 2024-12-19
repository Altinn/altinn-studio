import React from 'react';
import { render, screen } from '@testing-library/react';
import { AllAccessPackages } from './AllAccessPackages';
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
};
const package2: PolicyAccessPackage = {
  id: 'package2',
  urn: 'urn:package2',
  name: package2Name,
  description: 'Second package',
};
const package3: PolicyAccessPackage = {
  id: 'package3',
  urn: 'urn:package3',
  name: 'Package Gamma',
  description: 'Third package',
};

const area1Name = 'Area 1';
const area2Name = 'Area 2';
const groupedAccessPackagesByArea: PolicyAccessPackageArea[] = [
  {
    id: 'area1',
    name: area1Name,
    urn: 'urn:area1',
    description: '',
    icon: 'BankNote',
    areaGroup: '',
    packages: [package1, package2],
  },
  {
    id: 'area2',
    name: area2Name,
    urn: 'urn:area2',
    description: '',
    icon: '',
    areaGroup: '',
    packages: [package3],
  },
];
describe('AllAccessPackages', () => {
  it('should render each package with search hits when searching', () => {
    render(
      <AllAccessPackages
        chosenAccessPackages={[]}
        accessPackagesToRender={groupedAccessPackagesByArea}
        searchValue='skatt'
        handleSelectAccessPackage={jest.fn()}
      />,
    );

    expect(screen.getByText(package1Name)).toBeInTheDocument();
    expect(screen.getByText(package2Name)).toBeInTheDocument();
  });

  it('should not render any access packages when not expanded', () => {
    render(
      <AllAccessPackages
        chosenAccessPackages={[]}
        accessPackagesToRender={groupedAccessPackagesByArea}
        searchValue=''
        handleSelectAccessPackage={jest.fn()}
      />,
    );

    expect(screen.queryByText(package1Name)).not.toBeInTheDocument();
    expect(screen.queryByText(package2Name)).not.toBeInTheDocument();
    expect(screen.queryByText(package3Name)).not.toBeInTheDocument();
  });

  it('should render PolicyAccordion components for each area', () => {
    render(
      <AllAccessPackages
        chosenAccessPackages={[]}
        accessPackagesToRender={groupedAccessPackagesByArea}
        searchValue=''
        handleSelectAccessPackage={jest.fn()}
      />,
    );

    expect(screen.getByText(area1Name)).toBeInTheDocument();
    expect(screen.getByText(area2Name)).toBeInTheDocument();
  });
});
