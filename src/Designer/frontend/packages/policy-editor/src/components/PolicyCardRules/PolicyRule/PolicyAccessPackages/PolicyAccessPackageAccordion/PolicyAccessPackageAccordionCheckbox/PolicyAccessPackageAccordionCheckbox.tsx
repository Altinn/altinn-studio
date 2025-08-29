import React, { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import classes from './PolicyAccessPackageAccordionCheckbox.module.css';
import { StudioCheckbox } from '@studio/components-legacy';
import type { PolicyAccessPackage } from 'app-shared/types/PolicyAccessPackages';

export type PolicyAccessPackageAccordionCheckboxProps = {
  accessPackage: PolicyAccessPackage;
  isChecked: boolean;
  handleSelectChange: (accessPackageUrn: string) => void;
};
export const PolicyAccessPackageAccordionCheckbox = ({
  accessPackage,
  isChecked,
  handleSelectChange,
}: PolicyAccessPackageAccordionCheckboxProps): ReactElement => {
  const { t } = useTranslation();
  const checkboxLabel = t(
    isChecked ? 'policy_editor.access_package_remove' : 'policy_editor.access_package_add',
    {
      packageName: accessPackage.name,
    },
  );

  return (
    <StudioCheckbox
      value='on'
      checked={isChecked}
      className={classes.accordionCheckbox}
      onChange={() => handleSelectChange(accessPackage.urn)}
      aria-label={checkboxLabel}
    />
  );
};
