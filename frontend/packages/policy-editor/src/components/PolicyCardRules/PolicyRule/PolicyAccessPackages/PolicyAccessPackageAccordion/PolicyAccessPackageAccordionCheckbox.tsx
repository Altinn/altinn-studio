import React, { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import classes from './PolicyAccessPackageAccordion.module.css';
import { StudioCheckbox } from '@studio/components';
import type { PolicyAccessPackage } from 'app-shared/types/PolicyAccessPackages';

type PolicyAccessPackageAccordionCheckBoxProps = {
  accessPackage: PolicyAccessPackage;
  isChecked: boolean;
  handleSelectChange: (accessPackageUrn: string) => void;
};
export const PolicyAccessPackageAccordionCheckBox = ({
  accessPackage,
  isChecked,
  handleSelectChange,
}: PolicyAccessPackageAccordionCheckBoxProps): ReactElement => {
  const { t } = useTranslation();
  const CHECKED_VALUE = 'on';

  const checkboxLabel = t(
    isChecked ? 'policy_editor.access_package_remove' : 'policy_editor.access_package_add',
    {
      packageName: accessPackage.name,
    },
  );

  return (
    <StudioCheckbox.Group
      legend=''
      className={classes.accordionCheckbox}
      value={isChecked ? [CHECKED_VALUE] : []}
      onChange={() => handleSelectChange(accessPackage.urn)}
    >
      <StudioCheckbox value={CHECKED_VALUE} aria-label={checkboxLabel} />
    </StudioCheckbox.Group>
  );
};
