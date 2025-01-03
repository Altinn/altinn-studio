import React, { type ReactElement } from 'react';
import cn from 'classnames';
import { PolicyAccessPackageAccordion } from '../PolicyAccessPackageAccordion';
import { PolicyAccordion } from '../PolicyAccordion';
import { isAccessPackageSelected } from '../policyAccessPackageUtils';
import type { PolicyAccessPackageArea } from 'app-shared/types/PolicyAccessPackages';
import classes from './AllAccessPackages.module.css';
import { PackageIcon } from '@studio/icons';
import * as Icons from './Icons';

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
  const IconComponent = Object.keys(Icons).includes(icon) ? Icons[icon] : PackageIcon;
  return <IconComponent className={cn(classes.accordionIcon, classes.iconContainer)} aria-hidden />;
};
