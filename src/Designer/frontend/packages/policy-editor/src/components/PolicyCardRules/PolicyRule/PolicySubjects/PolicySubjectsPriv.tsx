import React, { useMemo } from 'react';
import { StudioAlert, StudioDetails, StudioTabs } from '@studio/components';
import { getPersonSubjects } from '../../../../utils/PolicyRuleUtils';
import { usePolicyEditorContext } from '../../../../contexts/PolicyEditorContext';
import { usePolicyRuleContext } from '../../../../contexts/PolicyRuleContext';
import classes from './PolicySubjects.module.css';
import { PersonIcon } from '@studio/icons';
import { PolicyAccessPackages } from '../PolicyAccessPackages';
import { useTranslation } from 'react-i18next';
import { RoleList } from './RoleList/RoleList';

enum TabId {
  AccessPackages = 'AccessPackages',
  Guardian = 'Guardian',
  Other = 'Other',
}

interface PolicySubjectsPrivProps {
  handleSubjectChange: (subjectUrn: string, subjectLegacyUrn?: string) => void;
}

export const PolicySubjectsPriv = ({ handleSubjectChange }: PolicySubjectsPrivProps) => {
  const { t } = useTranslation();
  const { subjects, accessPackagesPriv } = usePolicyEditorContext();
  const { policyRule } = usePolicyRuleContext();

  const personSubjects = useMemo(() => {
    return getPersonSubjects(subjects);
  }, [subjects]);

  return (
    <StudioDetails>
      <StudioDetails.Summary>
        <PersonIcon fontSize={28} /> For privatperson
      </StudioDetails.Summary>
      <StudioDetails.Content className={classes.subjectBlock}>
        <StudioTabs defaultValue={TabId.AccessPackages}>
          <StudioTabs.List>
            <StudioTabs.Tab value={TabId.AccessPackages}>
              {t('policy_editor.rule_card_subjects_access_packages')}
            </StudioTabs.Tab>
            <StudioTabs.Tab value={TabId.Guardian}>Vergemål</StudioTabs.Tab>
            <StudioTabs.Tab value={TabId.Other}>
              {t('policy_editor.rule_card_subjects_other_roles')}
            </StudioTabs.Tab>
          </StudioTabs.List>
          <StudioTabs.Panel value={TabId.AccessPackages}>
            <PolicyAccessPackages accessPackages={accessPackagesPriv} />
          </StudioTabs.Panel>
          <StudioTabs.Panel value={TabId.Guardian}>
            <StudioAlert data-color='info'>
              Valg av vergemål er ikke ferdig utviklet enda, men det vil vises her i løpet av våren
              2026.
            </StudioAlert>
          </StudioTabs.Panel>
          <StudioTabs.Panel value={TabId.Other}>
            <RoleList
              selectedSubjects={policyRule.subject}
              subjects={personSubjects}
              heading={t('policy_editor.rule_card_subjects_other_roles')}
              handleChange={handleSubjectChange}
            />
          </StudioTabs.Panel>
        </StudioTabs>
      </StudioDetails.Content>
    </StudioDetails>
  );
};
