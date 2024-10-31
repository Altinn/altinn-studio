import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Paragraph, Alert, CheckboxGroup, Checkbox } from '@digdir/designsystemet-react';
import { StudioLabelAsParagraph } from '@studio/components';
import type { PolicyAccessPackage } from '../../../../types';
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

  const PROTO_VERSION = 2;

  return (
    <div className={classes.accessPackages}>
      <Alert severity='warning' size='sm'>
        <StudioLabelAsParagraph size='md' spacing>
          {t('policy_editor.access_package_warning_header')}
        </StudioLabelAsParagraph>
        <Paragraph size='sm'>{t('policy_editor.access_package_warning_body')}</Paragraph>
      </Alert>
      <StudioLabelAsParagraph size='sm'>
        {t('policy_editor.access_package_header')}
      </StudioLabelAsParagraph>
      {PROTO_VERSION === 1 && (
        <>
          {accessPackages
            .filter((accessPackage) => chosenAccessPackages.includes(accessPackage.urn))
            .map(renderAccessPackageAccordion)}
          <br />
        </>
      )}
      {groupedAccessPackagesByArea.map(({ area, packages }) => {
        const chosenPackagesInArea = packages.filter((pack) =>
          chosenAccessPackages.includes(pack.urn),
        );

        const collapsedChildren =
          chosenPackagesInArea.length > 0 && PROTO_VERSION === 2
            ? chosenPackagesInArea.map(renderAccessPackageAccordion)
            : undefined;

        return (
          <PolicyAccordion
            key={area.id}
            icon={area.iconName}
            title={area.name}
            subTitle={area.shortDescription}
            collapsedChildren={collapsedChildren}
          >
            {packages.map(renderAccessPackageAccordion)}
          </PolicyAccordion>
        );
      })}
    </div>
  );
};
