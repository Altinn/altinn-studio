import React, { type ReactElement } from 'react';
import cn from 'classnames';
import { PolicyAccessPackageAccordion } from '../PolicyAccessPackageAccordion';
import { PolicyAccordion } from '../PolicyAccordion';
import { isAccessPackageSelected } from '../policyAccessPackageUtils';
import type { PolicyAccessPackageArea } from 'app-shared/types/PolicyAccessPackages';
import classes from './AllAccessPackages.module.css';
// import all icons from StudioIcons. This is because access package area icons are defined in the json
// we load, and we do not know which icons that is (only that the icons are present in StudioIcons).
// this will be changed later in early 2025, when we will use specific icons for access package areas
import * as StudioIcons from '@studio/icons';

export type AllAccessPackagesProps = {
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
      icon={<PolicyAccordionIcon icon={area.icon} />}
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

type PolicyAccordionIconProps = { icon: string };
const PolicyAccordionIcon = ({ icon }: PolicyAccordionIconProps): ReactElement => {
  const IconComponent = Object.keys(StudioIcons).includes(icon)
    ? StudioIcons[icon]
    : StudioIcons.PackageIcon;
  return <IconComponent className={cn(classes.accordionIcon, classes.iconContainer)} aria-hidden />;
};
