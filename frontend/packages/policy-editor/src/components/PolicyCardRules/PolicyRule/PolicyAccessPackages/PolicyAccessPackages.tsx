import React, { type ReactElement, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  StudioAlert,
  StudioLabelAsParagraph,
  StudioParagraph,
  StudioTextfield,
} from '@studio/components';
import { getUpdatedRules } from '../../../../utils/PolicyRuleUtils';
import { usePolicyEditorContext } from '../../../../contexts/PolicyEditorContext';
import { usePolicyRuleContext } from '../../../../contexts/PolicyRuleContext';
import classes from './PolicyAccessPackages.module.css';
import {
  filterAccessPackagesBySearchString,
  groupAccessPackagesByArea,
  isAccessPackageSelected,
} from './policyAccessPackageUtils';
import { ChosenAccessPackages } from './ChosenAccessPackages/ChosenAccessPackages';
import { AllAccessPackages } from './AllAccessPackages/AllAccessPackages';

export const PolicyAccessPackages = (): ReactElement => {
  const { t } = useTranslation();
  const [searchValue, setSearchValue] = useState<string>('');
  const { policyRules, accessPackages, setPolicyRules, savePolicy } = usePolicyEditorContext();
  const { policyRule } = usePolicyRuleContext();

  const [chosenAccessPackages, setChosenAccessPackages] = useState<string[]>(
    policyRule.accessPackages,
  );

  const groupedAccessPackagesByArea = useMemo(() => {
    return groupAccessPackagesByArea(accessPackages);
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
    groupedAccessPackagesByArea,
    searchValue,
  );

  return (
    <div className={classes.accessPackages}>
      <StudioAlert severity='warning' size='sm'>
        <StudioLabelAsParagraph size='md' spacing>
          {t('policy_editor.access_package_warning_header')}
        </StudioLabelAsParagraph>
        <StudioParagraph size='sm'>
          {t('policy_editor.access_package_warning_body')}
        </StudioParagraph>
      </StudioAlert>
      <StudioLabelAsParagraph size='md' spacing>
        {t('policy_editor.access_package_header')}
      </StudioLabelAsParagraph>
      <ChosenAccessPackages
        chosenAccessPackages={chosenAccessPackages}
        groupedAccessPackagesByArea={groupedAccessPackagesByArea}
        handleSelectAccessPackage={handleSelectAccessPackage}
      />
      <StudioLabelAsParagraph size='xs' spacing>
        {t('policy_editor.access_package_all_packages')}
      </StudioLabelAsParagraph>
      <StudioTextfield
        label={
          <StudioLabelAsParagraph size='xs'>
            {t('policy_editor.access_package_search')}
          </StudioLabelAsParagraph>
        }
        hideLabel
        placeholder={t('policy_editor.access_package_search')}
        size='small'
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
