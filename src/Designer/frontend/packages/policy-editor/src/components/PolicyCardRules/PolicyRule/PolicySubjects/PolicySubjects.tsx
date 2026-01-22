import React, { useMemo } from 'react';
import { getUpdatedRules } from '../../../../utils/PolicyRuleUtils';
import { usePolicyEditorContext } from '../../../../contexts/PolicyEditorContext';
import { usePolicyRuleContext } from '../../../../contexts/PolicyRuleContext';
import classes from './PolicySubjects.module.css';
import { useTranslation } from 'react-i18next';
import type { PolicyAccessPackage } from 'app-shared/types/PolicyAccessPackages';
import { findSubject, hasSubject } from '@altinn/policy-editor/utils';
import { SubjectListItem } from './SubjectListItem';
import { PolicySubjectsPriv } from './PolicySubjectsPriv';
import { PolicySubjectsOrg } from './PolicySubjectsOrg';
import { PackageIcon, PersonTallShortIcon } from '@studio/icons';
import { ErrorMessage } from '@digdir/designsystemet-react';

export const PolicySubjects = () => {
  const { t } = useTranslation();
  const { policyRules, subjects, accessPackages, accessPackagesPriv, setPolicyRules, savePolicy } =
    usePolicyEditorContext();
  const { policyRule, policyError, showAllErrors, setPolicyError } = usePolicyRuleContext();

  const flatAccessPackagesOrg = useMemo(() => {
    return accessPackages.flatMap((a) => a.areas).flatMap((a) => a.packages);
  }, [accessPackages]);
  const flatAccessPackagesPriv = useMemo(() => {
    return accessPackagesPriv.flatMap((a) => a.areas).flatMap((a) => a.packages);
  }, [accessPackagesPriv]);

  const [chosenOrgAccessPackages, chosenPrivAccessPackages] = useMemo(() => {
    const org: PolicyAccessPackage[] = [];
    const priv: PolicyAccessPackage[] = [];

    policyRule.accessPackages.forEach((urn) => {
      const orgPackage = flatAccessPackagesOrg.find((p) => p.urn === urn);
      const privPackage = flatAccessPackagesPriv.find((p) => p.urn === urn);

      if (orgPackage) {
        org.push(orgPackage);
      } else if (privPackage) {
        priv.push(privPackage);
      } else {
        // If urn is not found in either org or priv access packages, add unknown access package to org array
        org.push({
          id: urn,
          urn,
          name: t('policy_editor.access_package_unknown_heading'),
          description: t('policy_editor.access_package_unknown_description', {
            accessPackageUrn: urn,
          }),
          isResourcePolicyAvailable: true,
        });
      }
    });

    return [org, priv];
  }, [policyRule.accessPackages, flatAccessPackagesOrg, flatAccessPackagesPriv, t]);

  const handleSubjectChange = (subjectUrn: string, subjectLegacyUrn?: string): void => {
    const updatedSubjects = hasSubject(policyRule.subject, subjectUrn, subjectLegacyUrn)
      ? policyRule.subject.filter((s) => s !== subjectUrn && s !== subjectLegacyUrn)
      : [...policyRule.subject, subjectLegacyUrn ?? subjectUrn]; // prefer legacyUrn over urn, until AM is updated to handle new subject urns

    const updatedRules = getUpdatedRules(
      { ...policyRule, subject: updatedSubjects },
      policyRule.ruleId,
      policyRules,
    );

    setPolicyRules(updatedRules);
    savePolicy(updatedRules);
    setPolicyError({
      ...policyError,
      subjectsError: policyRule.accessPackages.length === 0 && updatedSubjects.length === 0,
    });
  };

  const handleRemoveAccessPackage = (selectedUrn: string): void => {
    // access packages can only be removed from this control
    const updateAccessPackages = policyRule.accessPackages.filter((s) => s !== selectedUrn);

    const updatedRules = getUpdatedRules(
      {
        ...policyRule,
        accessPackages: updateAccessPackages,
      },
      policyRule.ruleId,
      policyRules,
    );
    setPolicyRules(updatedRules);
    savePolicy(updatedRules);
  };

  return (
    <div>
      <div className={classes.subjectHeader}>{t('policy_editor.rule_card_subjects_title')}</div>
      <div data-color='neutral' className={classes.subjectDescription}>
        {t('policy_editor.rule_card_subjects_subtitle')}
      </div>
      {policyRule.subject.length > 0 && (
        <div className={classes.selectedSubjectList}>
          <div className={classes.selectedListTitle}>
            {t('policy_editor.rule_card_subjects_chosen_roles')}
          </div>
          {policyRule.subject.map((urn) => {
            const subject = findSubject(subjects, urn);
            const displayCode = subject?.legacyRoleCode || subject?.code;
            const legacyRoleCode = displayCode ? ` (${displayCode})` : '';

            return (
              <SubjectListItem
                key={`${urn}-selected`}
                urn={urn}
                legacyUrn={subject?.legacyUrn}
                title={`${subject?.name}${legacyRoleCode}`}
                icon={PersonTallShortIcon}
                isChecked={true}
                isSelectedListItem
                handleChange={handleSubjectChange}
              />
            );
          })}
        </div>
      )}
      {chosenOrgAccessPackages.length > 0 && (
        <ChosenAccessPackages
          heading='Valgte tilgangspakker for virksomhet'
          accessPackages={chosenOrgAccessPackages}
          handleRemoveAccessPackage={handleRemoveAccessPackage}
        />
      )}
      {chosenPrivAccessPackages.length > 0 && (
        <ChosenAccessPackages
          heading='Valgte tilgangspakker for privatperson'
          accessPackages={chosenPrivAccessPackages}
          handleRemoveAccessPackage={handleRemoveAccessPackage}
        />
      )}
      <PolicySubjectsOrg handleSubjectChange={handleSubjectChange} />
      <PolicySubjectsPriv handleSubjectChange={handleSubjectChange} />
      {showAllErrors && policyError.subjectsError && (
        <ErrorMessage size='small'>{t('policy_editor.rule_card_subjects_error')}</ErrorMessage>
      )}
    </div>
  );
};

interface ChosenAccessPackagesProps {
  heading: string;
  accessPackages: PolicyAccessPackage[];
  handleRemoveAccessPackage: (selectedAccessPackageUrn: string) => void;
}
const ChosenAccessPackages = ({
  heading,
  accessPackages,
  handleRemoveAccessPackage,
}: ChosenAccessPackagesProps) => {
  return (
    <div className={classes.selectedSubjectList}>
      <div className={classes.selectedListTitle}>{heading}</div>
      {accessPackages.map((accessPackage) => {
        return (
          <SubjectListItem
            key={`${accessPackage.urn}-selected`}
            urn={accessPackage.urn}
            title={accessPackage.name}
            icon={PackageIcon}
            isChecked={true}
            isSelectedListItem
            handleChange={handleRemoveAccessPackage}
          />
        );
      })}
    </div>
  );
};
