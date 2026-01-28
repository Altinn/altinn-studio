import React, { useMemo } from 'react';
import { StudioDetails, StudioTabs } from '@studio/components';
import {
  getAltinnSubjects,
  getCcrSubjects,
  getOtherSubjects,
} from '../../../../utils/PolicyRuleUtils';
import { usePolicyEditorContext } from '../../../../contexts/PolicyEditorContext';
import { usePolicyRuleContext } from '../../../../contexts/PolicyRuleContext';
import classes from './PolicySubjects.module.css';
import { PolicyAccessPackages } from '../PolicyAccessPackages';
import { useTranslation } from 'react-i18next';
import { RoleList } from './RoleList/RoleList';

enum TabId {
  ErRoles = 'ErRoles',
  AccessPackages = 'AccessPackages',
  AltinnRoles = 'AltinnRoles',
  Other = 'Other',
}

interface PolicySubjectsOrgProps {
  handleSubjectChange: (subjectUrn: string, subjectLegacyUrn?: string) => void;
}

export const PolicySubjectsOrg = ({ handleSubjectChange }: PolicySubjectsOrgProps) => {
  const { t } = useTranslation();
  const { subjects, accessPackages } = usePolicyEditorContext();
  const { policyRule } = usePolicyRuleContext();

  const ccrSubjects = useMemo(() => {
    return getCcrSubjects(subjects);
  }, [subjects]);
  const altinnSubjects = useMemo(() => {
    return getAltinnSubjects(subjects);
  }, [subjects]);
  const otherSubjects = useMemo(() => {
    return getOtherSubjects(subjects);
  }, [subjects]);

  return (
    <StudioDetails data-color='neutral'>
      <StudioDetails.Summary className={classes.orgAccordion}>
        {t('policy_editor.org_subjects_header')}
      </StudioDetails.Summary>
      <StudioDetails.Content className={classes.subjectBlock}>
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
            {otherSubjects.length > 0 && (
              <StudioTabs.Tab value={TabId.Other}>
                {t('policy_editor.rule_card_subjects_other_roles')}
              </StudioTabs.Tab>
            )}
          </StudioTabs.List>
          <StudioTabs.Panel value={TabId.ErRoles}>
            <RoleList
              selectedSubjects={policyRule.subject}
              subjects={ccrSubjects}
              heading={t('policy_editor.rule_card_subjects_ccr_roles')}
              handleChange={handleSubjectChange}
            />
          </StudioTabs.Panel>
          <StudioTabs.Panel value={TabId.AccessPackages}>
            <PolicyAccessPackages accessPackages={accessPackages} />
          </StudioTabs.Panel>
          <StudioTabs.Panel value={TabId.AltinnRoles}>
            <RoleList
              selectedSubjects={policyRule.subject}
              subjects={altinnSubjects}
              heading={t('policy_editor.rule_card_subjects_altinn_roles')}
              handleChange={handleSubjectChange}
            />
          </StudioTabs.Panel>
          <StudioTabs.Panel value={TabId.Other}>
            <RoleList
              selectedSubjects={policyRule.subject}
              subjects={otherSubjects}
              heading={t('policy_editor.rule_card_subjects_other_roles')}
              handleChange={handleSubjectChange}
            />
          </StudioTabs.Panel>
        </StudioTabs>
      </StudioDetails.Content>
    </StudioDetails>
  );
};
