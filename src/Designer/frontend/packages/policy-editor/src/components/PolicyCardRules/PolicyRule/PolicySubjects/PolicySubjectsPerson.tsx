import React from 'react';
import { StudioDetails, StudioTabs } from '@studio/components';
import { usePolicyRuleContext } from '../../../../contexts/PolicyRuleContext';
import classes from './PolicySubjects.module.css';
import { PolicyAccessPackages } from '../PolicyAccessPackages';
import { useTranslation } from 'react-i18next';
import { RoleList } from './RoleList/RoleList';
import { PersonIcon } from '@studio/icons';
import type { PolicySubject } from '@altinn/policy-editor/types';
import type { PolicyAccessPackageAreaGroup } from 'app-shared/types/PolicyAccessPackages';

enum TabId {
  AccessPackages = 'AccessPackages',
  Guardian = 'Guardian',
  Other = 'Other',
}

interface PolicySubjectsPersonProps {
  personSubjects: PolicySubject[];
  personAccessPackages: PolicyAccessPackageAreaGroup[];
  guardianshipAccessPackages: PolicyAccessPackageAreaGroup[];
  handleSubjectChange: (subjectUrn: string, subjectLegacyUrn?: string) => void;
}

export const PolicySubjectsPerson = ({
  personSubjects,
  personAccessPackages,
  guardianshipAccessPackages,
  handleSubjectChange,
}: PolicySubjectsPersonProps) => {
  const { t } = useTranslation();
  const { policyRule } = usePolicyRuleContext();

  return (
    <StudioDetails data-color='neutral'>
      <StudioDetails.Summary className={classes.personAccordion}>
        <PersonIcon fontSize={28} /> {t('policy_editor.person_subjects_header')}
      </StudioDetails.Summary>
      <StudioDetails.Content className={classes.subjectBlock}>
        <StudioTabs defaultValue={TabId.AccessPackages}>
          <StudioTabs.List>
            <StudioTabs.Tab value={TabId.AccessPackages}>
              {t('policy_editor.rule_card_subjects_access_packages')}
            </StudioTabs.Tab>
            <StudioTabs.Tab value={TabId.Guardian}>
              {t('policy_editor.rule_card_subjects_guardianships')}
            </StudioTabs.Tab>
            <StudioTabs.Tab value={TabId.Other}>
              {t('policy_editor.rule_card_subjects_other_roles')}
            </StudioTabs.Tab>
          </StudioTabs.List>
          <StudioTabs.Panel value={TabId.AccessPackages}>
            <PolicyAccessPackages accessPackages={personAccessPackages} isPersonSubject />
          </StudioTabs.Panel>
          <StudioTabs.Panel value={TabId.Guardian}>
            <PolicyAccessPackages accessPackages={guardianshipAccessPackages} isPersonSubject />
          </StudioTabs.Panel>
          <StudioTabs.Panel value={TabId.Other}>
            <RoleList
              selectedSubjects={policyRule.subject}
              subjects={personSubjects}
              isPersonSubject
              heading={t('policy_editor.rule_card_subjects_other_roles')}
              handleChange={handleSubjectChange}
            />
          </StudioTabs.Panel>
        </StudioTabs>
      </StudioDetails.Content>
    </StudioDetails>
  );
};
