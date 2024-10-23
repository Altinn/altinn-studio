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
          {t('policy_editor.access_package_warning_header')}
        </StudioLabelAsParagraph>
        <Paragraph size='sm'>{t('policy_editor.access_package_warning_body')}</Paragraph>
      </Alert>
      <StudioLabelAsParagraph size='sm'>
        {t('policy_editor.access_package_header')}
      </StudioLabelAsParagraph>
      {accessPackages.tagGroups.map((tagGroup) => {
        // find tags in tagGroup
        const tagsInTagGroup = accessPackages.tags.filter((tag) =>
          tag.tagGroups.includes(tagGroup.id),
        );

        return (
          <>
            <div>{tagGroup.name[selectedLanguage]}</div>
            {tagsInTagGroup.map((tag) => {
              // find chosen packages in current tag
              const accessPackagesInTag = accessPackages.accessPackages.filter((accessPackage) =>
                accessPackage.tags.includes(tag.id),
              );
              const numberChosenInTag = accessPackagesInTag.filter((pack) =>
                chosenAccessPackages.includes(pack.urn),
              ).length;
              return (
                <PolicyAccordion
                  key={tag.id}
                  icon={tag.icon}
                  title={tag.name[selectedLanguage]}
                  subTitle={tag.shortDescription[selectedLanguage]}
                  selectedCount={numberChosenInTag}
                >
                  <div className={classes.accordionContent}>
                    <Paragraph size='xs'>{tag.description[selectedLanguage]}</Paragraph>
                    {accessPackagesInTag.map((tagPackage) => {
                      const isChecked = chosenAccessPackages.includes(tagPackage.urn);
                      return (
                        <PolicyAccessPackageAccordion
                          key={tagPackage.urn}
                          accessPackage={tagPackage}
                          isChecked={isChecked}
                          selectedLanguage={selectedLanguage}
                          onChange={() => {
                            if (isChecked) {
                              handleRemoveAccessPackage(tagPackage);
                            } else {
                              handleAddAccessPackage(tagPackage);
                            }
                          }}
                        />
                      );
                    })}
                  </div>
                </PolicyAccordion>
              );
            })}
          </>
        );
      })}
      {showAllErrors && policyError.subjectsError && (
        <ErrorMessage size='sm'>{t('policy_editor.rule_card_subjects_error')}</ErrorMessage>
      )}
    </div>
  );
};
