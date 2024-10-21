import React, { useState } from 'react';
import { Label, ErrorMessage, Paragraph, Alert, Heading } from '@digdir/designsystemet-react';
import type { PolicyAccessPackage } from '../../../../types';
import { getAccessPackageOptions, getUpdatedRules } from '../../../../utils/PolicyRuleUtils';
import { useTranslation } from 'react-i18next';
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

  const [chosenAccessPackages, setChosenAccessPackages] = useState<PolicyAccessPackage[]>(
    getAccessPackageOptions(accessPackages.accessPackages, policyRule),
  );

  const handleRemoveAccessPackage = (accessPackageToRemove: PolicyAccessPackage): void => {
    setChosenAccessPackages((old) => old.filter((y) => y.urn !== accessPackageToRemove.urn));
    const accessPackagesToSave = policyRule.accessPackages.filter(
      (x) => x !== accessPackageToRemove.urn,
    );

    handleAccessPackageChange(accessPackagesToSave);
  };

  const handleAddAccessPackage = (accessPackageToAdd: PolicyAccessPackage): void => {
    setChosenAccessPackages((old) => [...old, accessPackageToAdd]);
    const accessPackagesToSave = [...policyRule.accessPackages, accessPackageToAdd.urn];

    handleAccessPackageChange(accessPackagesToSave);
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

  const chosenUrns = chosenAccessPackages.map((x) => x.urn);

  return (
    <div className={classes.accessPackages}>
      <Alert severity='warning' size='sm'>
        <Heading level={2} size='2xs' spacing>
          Tilgangspakker tar over for Altinn-rollene
        </Heading>
        <Paragraph size='sm'>
          Altinn-rollene fases snart ut, og da vil rollene som er lagt til, ikke lenger være gyldig.
          Du må derfor legge til minst en Tilgangspakke for å unngå at regelen blir ugyldig.
        </Paragraph>
      </Alert>
      <Label size='sm'>Tilgangspakker</Label>
      {accessPackages.categories.map((category) => {
        // find chosen packages in current category
        const accessPackagesInCategory = accessPackages.accessPackages
          .filter((accessPackage) => accessPackage.category === category.id)
          .map((accessPackage) => {
            return {
              accessPackage: accessPackage,
              isChecked: chosenUrns.indexOf(accessPackage.urn) > -1,
            };
          });
        const numberChosenInCategory = accessPackagesInCategory.filter((x) => x.isChecked).length;
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
                return (
                  <PolicyAccessPackageAccordion
                    key={categoryPackage.accessPackage.urn}
                    accessPackage={categoryPackage.accessPackage}
                    isChecked={categoryPackage.isChecked}
                    selectedLanguage={selectedLanguage}
                    onChange={() => {
                      if (categoryPackage.isChecked) {
                        handleRemoveAccessPackage(categoryPackage.accessPackage);
                      } else {
                        handleAddAccessPackage(categoryPackage.accessPackage);
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
