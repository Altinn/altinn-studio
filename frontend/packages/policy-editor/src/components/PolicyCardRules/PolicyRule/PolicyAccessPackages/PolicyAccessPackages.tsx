import React, { useState } from 'react';
import { Label, ErrorMessage, Paragraph, Accordion, Tag } from '@digdir/designsystemet-react';
import type { PolicyAccessPackage } from '../../../../types';
import { getAccessPackageOptions, getUpdatedRules } from '../../../../utils/PolicyRuleUtils';
import { useTranslation } from 'react-i18next';
import { usePolicyEditorContext } from '../../../../contexts/PolicyEditorContext';
import { usePolicyRuleContext } from '../../../../contexts/PolicyRuleContext';
import classes from './PolicyAccessPackages.module.css';
import { PolicyAccessPackageCard } from './PolicyAccessPackageCard';
import { Divider } from 'app-shared/primitives';

const selectedLanguage = 'nb';

export const PolicyAccessPackages = (): React.ReactElement => {
  const { t } = useTranslation();
  const { policyRules, accessPackages, setPolicyRules, savePolicy } = usePolicyEditorContext();
  const { policyRule, showAllErrors, policyError } = usePolicyRuleContext();

  const [chosenAccessPackages, setChosenAccessPackages] = useState<PolicyAccessPackage[]>(
    getAccessPackageOptions(accessPackages, policyRule),
  );

  const handleRemoveAccessPackage = (accessPackageToRemove: PolicyAccessPackage): void => {
    setChosenAccessPackages((old) => old.filter((y) => y.urn !== accessPackageToRemove.urn));

    const accessPackagesToSave = policyRule.accessPackages.filter(
      (x) => x !== accessPackageToRemove.urn,
    );
    const updatedRules = getUpdatedRules(
      {
        ...policyRule,
        accessPackages: accessPackagesToSave,
      },
      policyRule.ruleId,
      policyRules,
    );

    setPolicyRules(updatedRules);
    savePolicy(updatedRules);
  };

  const handleAddAccessPackage = (accessPackageToAdd: PolicyAccessPackage): void => {
    setChosenAccessPackages((old) => [...old, accessPackageToAdd]);

    const accessPackagesToSave = [...policyRule.accessPackages, accessPackageToAdd.urn];
    const updatedRules = getUpdatedRules(
      {
        ...policyRule,
        accessPackages: accessPackagesToSave,
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
      <Label size='small'>Tilgangspakker</Label>
      {chosenAccessPackages.length === 0 && <div>Her ser du tilgangspakkene du har lagt til</div>}
      {chosenAccessPackages.length > 0 && (
        <Accordion color='second'>
          <Accordion.Item>
            <Accordion.Header>
              <div>Tilgangspakkene du har valgt ({chosenAccessPackages.length} tilgangspakker)</div>
            </Accordion.Header>
            <Accordion.Content>
              <div className={classes.categoryContent}>
                {chosenAccessPackages.map((accessPackage) => {
                  const isChecked = chosenAccessPackages.some((x) => x.urn === accessPackage.urn);
                  return (
                    <PolicyAccessPackageCard
                      key={accessPackage.urn}
                      accessPackage={accessPackage}
                      selectedLanguage={selectedLanguage}
                      isChecked={isChecked}
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
              </div>
            </Accordion.Content>
          </Accordion.Item>
        </Accordion>
      )}
      <Divider marginless />
      <Paragraph size='large'>Kategorier</Paragraph>
      <div>
        {accessPackages.map((category) => {
          // find number of chosen packages in current category
          const chosenInCategory = category.packages.filter(
            (x) => chosenUrns.indexOf(x.urn) > -1,
          ).length;
          return (
            <Accordion key={category.id} color='first'>
              <Accordion.Item>
                <Accordion.Header>
                  <div className={classes.accordionHeader}>
                    <span>{category.name[selectedLanguage]}</span>
                    <Tag size='sm'>
                      {chosenInCategory > 0 ? `${chosenInCategory} av ` : ''}
                      {category.packages.length}
                    </Tag>
                  </div>
                </Accordion.Header>
                <Accordion.Content>
                  <div className={classes.categoryContent}>
                    <Paragraph size='sm'>{category.description[selectedLanguage]}</Paragraph>
                    {category.packages.map((accessPackage) => {
                      const isChecked = chosenAccessPackages.some(
                        (x) => x.urn === accessPackage.urn,
                      );
                      return (
                        <PolicyAccessPackageCard
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
                  </div>
                </Accordion.Content>
              </Accordion.Item>
            </Accordion>
          );
        })}
      </div>
      {showAllErrors && policyError.subjectsError && (
        <ErrorMessage size='small'>{t('policy_editor.rule_card_subjects_error')}</ErrorMessage>
      )}
    </div>
  );
};
