import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Paragraph, Alert, CheckboxGroup, Checkbox } from '@digdir/designsystemet-react';
import { StudioLabelAsParagraph, StudioTextfield } from '@studio/components';
import type { PolicyAccessPackage, PolicyAccessPackageArea } from '../../../../types';
import { getUpdatedRules } from '../../../../utils/PolicyRuleUtils';
import { usePolicyEditorContext } from '../../../../contexts/PolicyEditorContext';
import { usePolicyRuleContext } from '../../../../contexts/PolicyRuleContext';
import classes from './PolicyAccessPackages.module.css';
import { PolicyAccessPackageAccordion } from './PolicyAccessPackageAccordion';
import { PolicyAccordion } from './PolicyAccordion/PolicyAccordion';
import { groupAccessPackagesByArea } from '@altinn/policy-editor/utils';

const CHECKED_VALUE = 'on';
const selectedLanguage = 'nb';

export const PolicyAccessPackages = (): React.ReactElement => {
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

  const onPackageSelectChange = (accessPackage: PolicyAccessPackage): void => {
    const isSelected = chosenAccessPackages.includes(accessPackage.urn);
    if (isSelected) {
      handleRemoveAccessPackage(accessPackage.urn);
    } else {
      handleAddAccessPackage(accessPackage.urn);
    }
  };

  const handleRemoveAccessPackage = (packageUrn: string): void => {
    setChosenAccessPackages((oldUrns) => oldUrns.filter((urn) => urn !== packageUrn));
    const urnsToSave = policyRule.accessPackages.filter((x) => x !== packageUrn);

    handleAccessPackageChange(urnsToSave);
  };

  const handleAddAccessPackage = (packageUrn: string): void => {
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

  const handleSearch = (search: string) => {
    setSearchValue(search);
  };

  const isStringMatch = (matchString: string) => {
    return matchString.toLowerCase().includes(searchValue.toLowerCase());
  };

  const accessPackagesToRender = groupedAccessPackagesByArea.reduce(
    (areas: PolicyAccessPackageArea[], area): PolicyAccessPackageArea[] => {
      const matchingPackages = area.packages.filter(
        (pack) => !searchValue || isStringMatch(pack.name) || isStringMatch(pack.description),
      );
      const returnAreas = [...areas];
      if (matchingPackages.length > 0) {
        returnAreas.push({ ...area, packages: matchingPackages });
      }
      return returnAreas;
    },
    [],
  );

  const renderAccessPackageAccordion = (accessPackage: PolicyAccessPackage): React.ReactNode => {
    const isChecked = chosenAccessPackages.includes(accessPackage.urn);
    const checkboxLabel = t(
      isChecked ? 'policy_editor.access_package_remove' : 'policy_editor.access_package_add',
      {
        packageName: accessPackage.name,
      },
    );
    const packageCheckbox = (
      <CheckboxGroup
        legend=''
        className={classes.accordionCheckbox}
        value={isChecked ? [CHECKED_VALUE] : []}
        onChange={() => onPackageSelectChange(accessPackage)}
      >
        <Checkbox value={CHECKED_VALUE} aria-label={checkboxLabel} />
      </CheckboxGroup>
    );
    return (
      <PolicyAccessPackageAccordion
        key={accessPackage.urn}
        accessPackage={accessPackage}
        selectedLanguage={selectedLanguage}
        selectPackageElement={packageCheckbox}
      />
    );
  };

  return (
    <div className={classes.accessPackages}>
      <Alert severity='warning' size='sm'>
        <StudioLabelAsParagraph size='md' spacing>
          {t('policy_editor.access_package_warning_header')}
        </StudioLabelAsParagraph>
        <Paragraph size='sm'>{t('policy_editor.access_package_warning_body')}</Paragraph>
      </Alert>
      <StudioLabelAsParagraph size='sm' spacing>
        {t('policy_editor.access_package_header')}
      </StudioLabelAsParagraph>
      <StudioTextfield
        label='Søk'
        size='small'
        value={searchValue}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => handleSearch(event.target.value)}
      />
      {chosenAccessPackages.length > 0 && (
        <>
          <StudioLabelAsParagraph size='xs' spacing>
            {t('policy_editor.access_package_chosen_packages')}
          </StudioLabelAsParagraph>
          {accessPackages
            .filter((accessPackage) => chosenAccessPackages.includes(accessPackage.urn))
            .map(renderAccessPackageAccordion)}
        </>
      )}
      <StudioLabelAsParagraph size='xs' spacing>
        {t('policy_editor.access_package_all_packages')}
      </StudioLabelAsParagraph>
      {accessPackagesToRender.map((area) => {
        return (
          <PolicyAccordion
            key={`${searchValue}-${area.id}`}
            icon={area.icon}
            title={area.name}
            subTitle={area.description}
            defaultOpen={!!searchValue}
          >
            {area.packages.map(renderAccessPackageAccordion)}
          </PolicyAccordion>
        );
      })}
    </div>
  );
};
