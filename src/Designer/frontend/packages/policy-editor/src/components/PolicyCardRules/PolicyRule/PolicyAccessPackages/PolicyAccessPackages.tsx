import React, { type ReactElement, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioLabelAsParagraph, StudioTextfield } from '@studio/components-legacy';
import { getUpdatedRules } from '../../../../utils/PolicyRuleUtils';
import { usePolicyEditorContext } from '../../../../contexts/PolicyEditorContext';
import { usePolicyRuleContext } from '../../../../contexts/PolicyRuleContext';
import classes from './PolicyAccessPackages.module.css';
import {
  filterAccessPackagesByIsDelegable,
  filterAccessPackagesBySearchString,
  groupAccessPackagesByArea,
  isAccessPackageSelected,
} from './policyAccessPackageUtils';
import { AllAccessPackages } from './AllAccessPackages';

export const PolicyAccessPackages = (): ReactElement => {
  const { t } = useTranslation();
  const { policyRules, accessPackages, setPolicyRules, savePolicy } = usePolicyEditorContext();
  const { policyRule } = usePolicyRuleContext();

  const [searchValue, setSearchValue] = useState<string>('');
  const [chosenAccessPackages, setChosenAccessPackages] = useState<string[]>(
    policyRule.accessPackages,
  );

  const groupedDelegableAccessPackagesByArea = useMemo(() => {
    const areas = groupAccessPackagesByArea(accessPackages);
    return filterAccessPackagesByIsDelegable(areas);
  }, [accessPackages]);

  const handleSelectAccessPackage = (packageUrn: string): void => {
    const isChecked = isAccessPackageSelected(packageUrn, chosenAccessPackages);

    if (isChecked) {
      handleDeselectAccessPackage(packageUrn);
    } else {
      handleSelectNewAccessPackage(packageUrn);
    }
  };

  const handleDeselectAccessPackage = (packageUrn: string): void => {
    setChosenAccessPackages((oldUrns) => oldUrns.filter((urn) => urn !== packageUrn));
    const urnsToSave = policyRule.accessPackages.filter((x) => x !== packageUrn);
    handleAccessPackageChange(urnsToSave);
  };

  const handleSelectNewAccessPackage = (packageUrn: string): void => {
    setChosenAccessPackages((oldUrns) => [...oldUrns, packageUrn]);
    const urnsToSave = [...policyRule.accessPackages, packageUrn];
    handleAccessPackageChange(urnsToSave);
  };

  const handleAccessPackageChange = (newSelectedAccessPackageUrns: string[]): void => {
    const updatedRules = getUpdatedRules(
      {
        ...policyRule,
        accessPackages: newSelectedAccessPackageUrns,
      },
      policyRule.ruleId,
      policyRules,
    );
    setPolicyRules(updatedRules);
    savePolicy(updatedRules);
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setSearchValue(event.target.value);
  };

  const accessPackagesToRender = filterAccessPackagesBySearchString(
    groupedDelegableAccessPackagesByArea,
    searchValue,
  );

  return (
    <div className={classes.accessPackages}>
      <StudioTextfield
        label={
          <StudioLabelAsParagraph size='xs'>
            {t('policy_editor.access_package_search')}
          </StudioLabelAsParagraph>
        }
        hideLabel
        placeholder={t('policy_editor.access_package_search')}
        value={searchValue}
        onChange={handleSearch}
      />
      <AllAccessPackages
        chosenAccessPackages={chosenAccessPackages}
        accessPackagesToRender={accessPackagesToRender}
        searchValue={searchValue}
        handleSelectAccessPackage={handleSelectAccessPackage}
      />
    </div>
  );
};
