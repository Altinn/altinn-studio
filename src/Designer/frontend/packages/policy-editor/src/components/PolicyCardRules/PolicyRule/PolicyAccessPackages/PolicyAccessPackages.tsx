import React, { type ReactElement, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioLabelAsParagraph, StudioTextfield } from '@studio/components';
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
import { ChosenAccessPackages } from './ChosenAccessPackages';
import { AllAccessPackages } from './AllAccessPackages';
import { PolicyAccessPackagesWarning } from './PolicyAccessPackagesWarning';
import { Accordion } from '@digdir/designsystemet-react';

export const PolicyAccessPackages = (): ReactElement => {
  const { t } = useTranslation();
  const { policyRules, accessPackages, setPolicyRules, savePolicy } = usePolicyEditorContext();
  const { policyRule, policyError, setPolicyError } = usePolicyRuleContext();

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
    setPolicyError({
      ...policyError,
      subjectsError: newSelectedAccessPackageUrns.length === 0 && policyRule.subject.length === 0,
    });
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
      <StudioLabelAsParagraph data-size='md'>
        {t('policy_editor.access_package_header')}
      </StudioLabelAsParagraph>
      <ChosenAccessPackages
        chosenAccessPackages={chosenAccessPackages}
        groupedAccessPackagesByArea={groupedDelegableAccessPackagesByArea}
        handleSelectAccessPackage={handleSelectAccessPackage}
      />
      <Accordion>
        <Accordion.Item>
          <Accordion.Header>{t('policy_editor.access_package_accordion_header')}</Accordion.Header>
          <Accordion.Content className={classes.accessPackages}>
            <PolicyAccessPackagesWarning />
            <StudioLabelAsParagraph data-size='xs'>
              {t('policy_editor.access_package_all_packages')}
            </StudioLabelAsParagraph>
            <StudioTextfield
              label={
                <StudioLabelAsParagraph data-size='xs'>
                  {t('policy_editor.access_package_search')}
                </StudioLabelAsParagraph>
              }
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
          </Accordion.Content>
        </Accordion.Item>
      </Accordion>
    </div>
  );
};
