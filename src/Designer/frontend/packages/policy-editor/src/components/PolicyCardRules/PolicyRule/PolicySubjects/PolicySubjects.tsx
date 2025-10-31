import React, { useMemo } from 'react';
import { StudioTabs } from '@studio/components';
import { getUpdatedRules } from '../../../../utils/PolicyRuleUtils';
import { usePolicyEditorContext } from '../../../../contexts/PolicyEditorContext';
import { usePolicyRuleContext } from '../../../../contexts/PolicyRuleContext';
import classes from './PolicySubjects.module.css';
import { PackageIcon, PersonTallShortIcon } from '@studio/icons';
import { PolicyAccessPackages } from '../PolicyAccessPackages';
import { ErrorMessage } from '@digdir/designsystemet-react';
import { useTranslation } from 'react-i18next';
import type { PolicyAccessPackage } from 'app-shared/types/PolicyAccessPackages';
import { RoleList } from './RoleList/RoleList';
import { findSubject, hasSubject } from '@altinn/policy-editor/utils';
import { SubjectListItem } from './SubjectListItem';

enum TabId {
  ErRoles = 'ErRoles',
  AccessPackages = 'AccessPackages',
  AltinnRoles = 'AltinnRoles',
  Other = 'Other',
}

export const PolicySubjects = () => {
  const { t } = useTranslation();
  const { policyRules, subjects, accessPackages, setPolicyRules, savePolicy } =
    usePolicyEditorContext();
  const { policyRule, showAllErrors, policyError, setPolicyError } = usePolicyRuleContext();

  const accessPackageList = useMemo(() => {
    return accessPackages.flatMap((a) => a.areas).flatMap((a) => a.packages);
  }, [accessPackages]);

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

  const handleRemoveAccessPackage = (selectedAccessPackageUrn: string): void => {
    // access packages can only be removed from this control
    const updateAccessPackages = policyRule.accessPackages.filter(
      (s) => s !== selectedAccessPackageUrn,
    );

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

  const createUnknownAccessPackageData = (urn: string): PolicyAccessPackage => {
    return {
      id: urn,
      urn,
      name: t('policy_editor.access_package_unknown_heading'),
      description: t('policy_editor.access_package_unknown_description', {
        accessPackageUrn: urn,
      }),
      isDelegable: true,
    };
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
            const legacyRoleCode = subject?.legacyRoleCode ? ` (${subject.legacyRoleCode})` : '';
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
      {policyRule.accessPackages.length > 0 && (
        <div className={classes.selectedSubjectList}>
          <div className={classes.selectedListTitle}>
            {t('policy_editor.rule_card_subjects_chosen_access_packages')}
          </div>
          {policyRule.accessPackages.map((accessPackageUrn) => {
            let accessPackage = accessPackageList.find((s) => s.urn === accessPackageUrn);
            if (!accessPackage) {
              accessPackage = createUnknownAccessPackageData(accessPackageUrn);
            }
            return (
              <SubjectListItem
                key={`${accessPackageUrn}-selected`}
                urn={accessPackageUrn}
                title={accessPackage.name}
                icon={PackageIcon}
                isChecked={true}
                isSelectedListItem
                handleChange={handleRemoveAccessPackage}
              />
            );
          })}
        </div>
      )}
      <StudioTabs defaultValue={TabId.ErRoles}>
        <StudioTabs.List>
          <StudioTabs.Tab value={TabId.ErRoles}>
            {t('policy_editor.rule_card_subjects_ccr_roles')}
          </StudioTabs.Tab>
          <StudioTabs.Tab value={TabId.AccessPackages}>
            {t('policy_editor.rule_card_subjects_access_packages')}
          </StudioTabs.Tab>
          <StudioTabs.Tab value={TabId.AltinnRoles}>
            {t('policy_editor.rule_card_subjects_altinn_roles')}
          </StudioTabs.Tab>
          {subjects.some((s) => s.provider?.code === 'sys-internal') && (
            <StudioTabs.Tab value={TabId.Other}>
              {t('policy_editor.rule_card_subjects_other_roles')}
            </StudioTabs.Tab>
          )}
        </StudioTabs.List>
        <StudioTabs.Panel value={TabId.ErRoles}>
          <RoleList
            selectedSubjects={policyRule.subject}
            subjects={subjects.filter((s) => s.provider?.code === 'sys-ccr')}
            heading={t('policy_editor.rule_card_subjects_ccr_roles')}
            handleChange={handleSubjectChange}
          />
        </StudioTabs.Panel>
        <StudioTabs.Panel value={TabId.AccessPackages}>
          <PolicyAccessPackages />
        </StudioTabs.Panel>
        <StudioTabs.Panel value={TabId.AltinnRoles}>
          <RoleList
            selectedSubjects={policyRule.subject}
            subjects={subjects.filter(
              (s) => s.provider?.code === 'sys-altinn2' || s.provider?.code === 'sys-altinn3',
            )}
            heading={t('policy_editor.rule_card_subjects_altinn_roles')}
            handleChange={handleSubjectChange}
          />
        </StudioTabs.Panel>
        <StudioTabs.Panel value={TabId.Other}>
          <RoleList
            selectedSubjects={policyRule.subject}
            subjects={subjects.filter((s) => s.provider?.code === 'sys-internal')}
            heading={t('policy_editor.rule_card_subjects_other_roles')}
            handleChange={handleSubjectChange}
          />
        </StudioTabs.Panel>
      </StudioTabs>
      {showAllErrors && policyError.subjectsError && (
        <ErrorMessage size='small'>{t('policy_editor.rule_card_subjects_error')}</ErrorMessage>
      )}
    </div>
  );
};
