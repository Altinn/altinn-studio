import React, { type ReactElement } from 'react';
import { PolicyAccessPackageAccordion } from './PolicyAccessPackageAccordion';
import { PolicyAccordion } from './PolicyAccordion';
import { isAccessPackageSelected } from './policyAccessPackageUtils';
import type { PolicyAccessPackageArea } from 'app-shared/types/PolicyAccessPackages';

type AllAccessPackagesProps = {
  chosenAccessPackages: string[];
  accessPackagesToRender: PolicyAccessPackageArea[];
  searchValue: string;
  handleSelectAccessPackage: (accessPackageUrn: string) => void;
};
export const AllAccessPackages = ({
  chosenAccessPackages,
  accessPackagesToRender,
  searchValue,
  handleSelectAccessPackage,
}: AllAccessPackagesProps): ReactElement[] => {
  return accessPackagesToRender.map((area) => (
    <PolicyAccordion
      key={`${searchValue}-${area.id}`}
      icon={area.icon || 'PackageIcon'}
      title={area.name}
      subTitle={area.description}
      defaultOpen={!!searchValue}
    >
      {area.packages.map((accessPackage) => (
        <PolicyAccessPackageAccordion
          key={accessPackage.urn}
          accessPackage={accessPackage}
          isChecked={isAccessPackageSelected(accessPackage.urn, chosenAccessPackages)}
          handleSelectChange={handleSelectAccessPackage}
        />
      ))}
    </PolicyAccordion>
  ));
};
