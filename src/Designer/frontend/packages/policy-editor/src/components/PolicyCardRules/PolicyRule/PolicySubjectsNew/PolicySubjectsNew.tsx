import React, { useMemo, useState } from 'react';
import { StudioAlert, StudioCheckbox, StudioSearch, StudioTabs } from '@studio/components';
import type { PolicySubject } from '../../../../types';
import { getUpdatedRules } from '../../../../utils/PolicyRuleUtils';
import { usePolicyEditorContext } from '../../../../contexts/PolicyEditorContext';
import { usePolicyRuleContext } from '../../../../contexts/PolicyRuleContext';
import classes from './PolicySubjectsNew.module.css';
import { PackageIcon, PersonTallShortIcon } from '@studio/icons';
import { PolicyAccessPackages } from '../PolicyAccessPackages';
import { ErrorMessage } from '@digdir/designsystemet-react';
import { useTranslation } from 'react-i18next';
import type { PolicyAccessPackage } from 'app-shared/types/PolicyAccessPackages';
import { SelectedSubjectsList } from './SelectedSubjectsList';

const hasSubject = (subjectList: string[], subject: string): boolean => {
  return subjectList.some((s) => s.toLowerCase() === subject.toLowerCase());
};

enum TabId {
  ErRoles = 'ErRoles',
  AccessPackages = 'AccessPackages',
  AltinnRoles = 'AltinnRoles',
  Other = 'Other',
}

export const PolicySubjectsNew = () => {
  const { t } = useTranslation();
  const { policyRules, subjects, accessPackages, setPolicyRules, savePolicy } =
    usePolicyEditorContext();
  const { policyRule, showAllErrors, policyError, setPolicyError } = usePolicyRuleContext();

  const accessPackageList = useMemo(() => {
    return accessPackages.flatMap((a) => a.areas).flatMap((a) => a.packages);
  }, [accessPackages]);

  const handleSubjectChange = (selectedSubjectId: string): void => {
    const updatedSubjects = hasSubject(policyRule.subject, selectedSubjectId)
      ? policyRule.subject.filter((s) => s !== selectedSubjectId)
      : [...policyRule.subject, selectedSubjectId];

    const updatedRules = getUpdatedRules(
      { ...policyRule, subject: updatedSubjects },
      policyRule.ruleId,
      policyRules,
    );

    setPolicyRules(updatedRules);
    savePolicy(updatedRules);
    setPolicyError({ ...policyError, subjectsError: updatedSubjects.length === 0 });
  };

  const handleAccessPackageChange = (selectedAccessPackageUrn: string): void => {
    const updateAccessPackages = hasSubject(policyRule.accessPackages, selectedAccessPackageUrn)
      ? policyRule.accessPackages.filter((s) => s !== selectedAccessPackageUrn)
      : [...policyRule.accessPackages, selectedAccessPackageUrn];

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
      <SelectedSubjectsList
        items={policyRule.subject.map((urn) => {
          const subject = subjects.find((s) => s.legacyUrn.toLowerCase() === urn.toLowerCase());
          return {
            urn: urn,
            title: `${subject.name} (${subject.legacyRoleCode})`,
          };
        })}
        title={t('policy_editor.rule_card_subjects_chosen_roles')}
        icon={<PersonTallShortIcon className={classes.iconContainer} />}
        handleChange={handleSubjectChange}
      />
      <SelectedSubjectsList
        items={policyRule.accessPackages.map((accessPackageUrn) => {
          let accessPackage = accessPackageList.find((s) => s.urn === accessPackageUrn);
          if (!accessPackage) {
            accessPackage = createUnknownAccessPackageData(accessPackageUrn);
          }
          return {
            urn: accessPackageUrn,
            title: accessPackage.name,
          };
        })}
        title={t('policy_editor.rule_card_subjects_chosen_access_packages')}
        icon={<PackageIcon className={classes.iconContainer} />}
        handleChange={handleAccessPackageChange}
      />
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
            subjects={subjects.filter((s) => s.provider?.code === 'sys-altinn2')}
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

interface RoleListProps {
  selectedSubjects: string[];
  subjects: PolicySubject[];
  heading: string;
  handleChange: (subject: string) => void;
}
const RoleList = ({ subjects, selectedSubjects, heading, handleChange }: RoleListProps) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState<string>('');

  const filteredSubjects = subjects.filter((subject) => {
    const isTitleMatch = subject.name.toLowerCase().includes(search.toLowerCase());
    const isIdMatch = subject.legacyRoleCode?.toLowerCase().includes(search.toLowerCase());
    const isDescriptionMatch = subject.description?.toLowerCase().includes(search.toLowerCase());
    return isTitleMatch || isIdMatch || isDescriptionMatch;
  });

  return (
    <div className={classes.subjectList}>
      <StudioSearch
        label=''
        aria-label={t('policy_editor.rule_card_subjects_search', { searchCollection: heading })}
        value={search}
        onChange={(event: any) => setSearch(event.target.value)}
      />
      {!!search && !filteredSubjects.length && (
        <StudioAlert data-color='info'>
          {t('policy_editor.rule_card_subjects_search_no_results', { searchCollection: heading })}
        </StudioAlert>
      )}
      {filteredSubjects.map((subject) => {
        const subjectTitle = `${subject.name} (${subject.legacyRoleCode})`;
        return (
          <div key={subject.legacyUrn} className={classes.subjectItem}>
            <PersonTallShortIcon className={classes.iconContainer} />
            <div className={classes.subjectTitle}>
              {subjectTitle}
              <div data-color='neutral' className={classes.subjectSubTitle}>
                {subject.description}
              </div>
            </div>
            <StudioCheckbox
              data-size='md'
              className={classes.subjectCheckbox}
              checked={hasSubject(selectedSubjects, subject.legacyUrn)}
              onChange={() => handleChange(subject.legacyUrn)}
              aria-label={subjectTitle}
            />
          </div>
        );
      })}
    </div>
  );
};
