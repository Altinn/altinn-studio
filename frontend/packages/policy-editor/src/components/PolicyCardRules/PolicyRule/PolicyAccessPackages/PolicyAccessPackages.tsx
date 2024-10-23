import React, { useState } from 'react';
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

const selectedLanguage = 'nb';

export const PolicyAccessPackages = (): React.ReactElement => {
  const { t } = useTranslation();
  const { policyRules, accessPackages, setPolicyRules, savePolicy } = usePolicyEditorContext();
  const { policyRule, showAllErrors, policyError } = usePolicyRuleContext();

  const [chosenAccessPackages, setChosenAccessPackages] = useState<string[]>(
    policyRule.accessPackages,
  );

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
          Tilgangspakker tar over for Altinn-rollene
        </StudioLabelAsParagraph>
        <Paragraph size='sm'>
          Altinn-rollene fases snart ut, og da vil rollene som er lagt til, ikke lenger være gyldig.
          Du må derfor legge til minst en Tilgangspakke for å unngå at regelen blir ugyldig.
        </Paragraph>
      </Alert>
      <StudioLabelAsParagraph size='sm'>Tilgangspakker</StudioLabelAsParagraph>
      {accessPackages.categories.map((category) => {
        // find chosen packages in current category
        const accessPackagesInCategory = accessPackages.accessPackages.filter(
          (accessPackage) => accessPackage.category === category.id,
        );
        const numberChosenInCategory = accessPackagesInCategory.filter((pack) =>
          chosenAccessPackages.includes(pack.urn),
        ).length;

        return (
          <PolicyAccordion
            key={category.id}
            icon={category.icon}
            title={category.name[selectedLanguage]}
            subTitle={category.shortDescription[selectedLanguage]}
            selectedCount={numberChosenInCategory}
          >
            <div className={classes.accordionContent}>
              <Paragraph size='xs'>{category.description[selectedLanguage]}</Paragraph>
              {accessPackagesInCategory.map((categoryPackage) => {
                const isChecked = chosenAccessPackages.includes(categoryPackage.urn);
                return (
                  <PolicyAccessPackageAccordion
                    key={categoryPackage.urn}
                    accessPackage={categoryPackage}
                    isChecked={isChecked}
                    selectedLanguage={selectedLanguage}
                    onChange={() => {
                      if (isChecked) {
                        handleRemoveAccessPackage(categoryPackage);
                      } else {
                        handleAddAccessPackage(categoryPackage);
                      }
                    }}
                  />
                );
              })}
            </div>
          </PolicyAccordion>
        );
      })}
      {showAllErrors && policyError.subjectsError && (
        <ErrorMessage size='sm'>{t('policy_editor.rule_card_subjects_error')}</ErrorMessage>
      )}
    </div>
  );
};
