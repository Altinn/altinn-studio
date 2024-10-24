import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ErrorMessage, Paragraph, Alert } from '@digdir/designsystemet-react';
import { StudioLabelAsParagraph } from '@studio/components';
import type { PolicyAccessPackage } from '../../../../types';
import { getUpdatedRules } from '../../../../utils/PolicyRuleUtils';
import { usePolicyEditorContext } from '../../../../contexts/PolicyEditorContext';
import { usePolicyRuleContext } from '../../../../contexts/PolicyRuleContext';
import classes from './PolicyAccessPackages.module.css';
import { PolicyAccessPackageAccordion } from './PolicyAccessPackageAccordion';
import { PolicyAccordion } from './PolicyAccordion/PolicyAccordion';
import { groupAccessPackagesByArea } from '@altinn/policy-editor/utils';

const selectedLanguage = 'nb';

export const PolicyAccessPackages = (): React.ReactElement => {
  const { t } = useTranslation();
  const { policyRules, accessPackages, setPolicyRules, savePolicy } = usePolicyEditorContext();
  const { policyRule, showAllErrors, policyError } = usePolicyRuleContext();

  const [chosenAccessPackages, setChosenAccessPackages] = useState<string[]>(
    policyRule.accessPackages,
  );

  const groupedAccessPackagesByArea = useMemo(() => {
    return groupAccessPackagesByArea(accessPackages);
  }, [accessPackages]);

  const handleRemoveAccessPackage = (accessPackageToRemove: PolicyAccessPackage): void => {
    setChosenAccessPackages((oldUrns) =>
      oldUrns.filter((urn) => urn !== accessPackageToRemove.urn),
    );
    const urnsToSave = policyRule.accessPackages.filter((x) => x !== accessPackageToRemove.urn);

    handleAccessPackageChange(urnsToSave);
  };

  const handleAddAccessPackage = (accessPackageToAdd: PolicyAccessPackage): void => {
    setChosenAccessPackages((oldUrns) => [...oldUrns, accessPackageToAdd.urn]);
    const urnsToSave = [...policyRule.accessPackages, accessPackageToAdd.urn];

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
      {groupedAccessPackagesByArea.map(({ area, packages }) => {
        // find chosen packages in current area
        const numberChosenInArea = packages.filter((pack) =>
          chosenAccessPackages.includes(pack.urn),
        ).length;

        return (
          <PolicyAccordion
            key={area.id}
            icon={area.iconName}
            title={area.name}
            subTitle={area.shortDescription}
            selectedCount={numberChosenInArea}
          >
            <Paragraph size='xs'>{area.description}</Paragraph>
            {packages.map((accessPackage) => {
              const isChecked = chosenAccessPackages.includes(accessPackage.urn);
              return (
                <PolicyAccessPackageAccordion
                  key={accessPackage.urn}
                  accessPackage={accessPackage}
                  isChecked={isChecked}
                  selectedLanguage={selectedLanguage}
                  onChange={() => {
                    if (isChecked) {
                      handleRemoveAccessPackage(accessPackage);
                    } else {
                      handleAddAccessPackage(accessPackage);
                    }
                  }}
                />
              );
            })}
          </PolicyAccordion>
        );
      })}
      {showAllErrors && policyError.subjectsError && (
        <ErrorMessage size='sm'>{t('policy_editor.rule_card_subjects_error')}</ErrorMessage>
      )}
    </div>
  );
};
