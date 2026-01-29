import React, { type ReactElement } from 'react';
import classes from './PolicyAccessPackageAccordion.module.css';
import { PolicyAccordion } from '../PolicyAccordion';
import { PolicyAccessPackageAccordionContent } from './PolicyAccessPackageAccordionContent';
import { PolicyAccessPackageAccordionCheckbox } from './PolicyAccessPackageAccordionCheckbox';
import type { PolicyAccessPackage } from 'app-shared/types/PolicyAccessPackages';

export type PolicyAccessPackageAccordionProps = {
  accessPackage: PolicyAccessPackage;
  isChecked: boolean;
  isPersonSubject?: boolean;
  handleSelectChange: (accessPackageUrn: string) => void;
};

export const PolicyAccessPackageAccordion = ({
  accessPackage,
  isChecked,
  isPersonSubject,
  handleSelectChange,
}: PolicyAccessPackageAccordionProps): ReactElement => {
  return (
    <div
      className={
        isPersonSubject ? classes.accessPackagePersonAccordion : classes.accessPackageOrgAccordion
      }
    >
      <PolicyAccordion
        title={accessPackage.name}
        subTitle={accessPackage.description}
        extraHeaderContent={
          <PolicyAccessPackageAccordionCheckbox
            isChecked={isChecked}
            handleSelectChange={handleSelectChange}
            accessPackage={accessPackage}
          />
        }
      >
        <PolicyAccessPackageAccordionContent accessPackageUrn={accessPackage.urn} />
      </PolicyAccordion>
    </div>
  );
};
