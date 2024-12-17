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
import { PolicyAccessPackageAccordion } from './PolicyAccessPackageAccordion';
import { PolicyAccordion } from './PolicyAccordion';
import {
  filterAccessPackagesBySearchString,
  groupAccessPackagesByArea,
} from './policyAccessPackageUtils';
import type { PolicyAccessPackageArea } from '@altinn/policy-editor';

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
    setChosenAccessPackages((oldUrns) => [...oldUrns, packageUrn]);
    const urnsToSave = [...policyRule.accessPackages, packageUrn];
    handleAccessPackageChange(urnsToSave);
  };

  const handleDeselectAccessPackage = (packageUrn: string): void => {
    setChosenAccessPackages((oldUrns) => oldUrns.filter((urn) => urn !== packageUrn));
    const urnsToSave = policyRule.accessPackages.filter((x) => x !== packageUrn);
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

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
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
        handleDeselectAccessPackage={handleDeselectAccessPackage}
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
        handleDeselectAccessPackage={handleDeselectAccessPackage}
      />
    </div>
  );
};

interface ChosenAccessPackagesProps {
  chosenAccessPackages: string[];
  groupedAccessPackagesByArea: PolicyAccessPackageArea[];
  handleDeselectAccessPackage: (accessPackageUrn: string) => void;
}
const ChosenAccessPackages = ({
  chosenAccessPackages,
  groupedAccessPackagesByArea,
  handleDeselectAccessPackage,
}: ChosenAccessPackagesProps): ReactElement => {
  const { t } = useTranslation();
  return (
    chosenAccessPackages.length > 0 && (
      <>
        <StudioLabelAsParagraph size='xs' spacing>
          {t('policy_editor.access_package_chosen_packages')}
        </StudioLabelAsParagraph>
        {groupedAccessPackagesByArea
          .flatMap((area) => area.packages)
          .filter((accessPackage) => chosenAccessPackages.includes(accessPackage.urn))
          .map((accessPackage) => {
            return (
              <PolicyAccessPackageAccordion
                key={accessPackage.urn}
                accessPackage={accessPackage}
                isChecked={true}
                handleSelectChange={handleDeselectAccessPackage}
              />
            );
          })}
      </>
    )
  );
};

interface AllAccessPackagesProps {
  chosenAccessPackages: string[];
  accessPackagesToRender: PolicyAccessPackageArea[];
  searchValue: string;
  handleSelectAccessPackage: (accessPackageUrn: string) => void;
  handleDeselectAccessPackage: (accessPackageUrn: string) => void;
}
const AllAccessPackages = ({
  chosenAccessPackages,
  accessPackagesToRender,
  searchValue,
  handleSelectAccessPackage,
  handleDeselectAccessPackage,
}: AllAccessPackagesProps): ReactElement[] => {
  const handleSelectChange = (accessPackageUrn: string): void => {
    const isChecked = chosenAccessPackages.includes(accessPackageUrn);
    if (isChecked) {
      handleDeselectAccessPackage(accessPackageUrn);
    } else {
      handleSelectAccessPackage(accessPackageUrn);
    }
  };

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
          isChecked={chosenAccessPackages.includes(accessPackage.urn)}
          handleSelectChange={handleSelectChange}
        />
      ))}
    </PolicyAccordion>
  ));
};
