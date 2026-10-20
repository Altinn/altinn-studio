import { useState } from 'react';
import { StudioDetails, StudioTabs } from '@studio/components';
import { usePolicyRuleContext } from '../../../../contexts/PolicyRuleContext';
import classes from './PolicySubjects.module.css';
import { Buildings3Icon } from '@studio/icons';
import { PolicyAccessPackages } from '../PolicyAccessPackages';
import { useTranslation } from 'react-i18next';
import { RoleList } from './RoleList/RoleList';
import type { PolicySubject } from '@altinn/policy-editor/types';
import type { PolicyAccessPackageAreaGroup } from 'app-shared/types/PolicyAccessPackages';

enum TabId {
  ErRoles = 'ErRoles',
  AccessPackages = 'AccessPackages',
  AltinnRoles = 'AltinnRoles',
  Other = 'Other',
}

interface PolicySubjectsOrgProps {
  ccrSubjects: PolicySubject[];
  altinnSubjects: PolicySubject[];
  otherSubjects: PolicySubject[];
  accessPackages: PolicyAccessPackageAreaGroup[];
  handleSubjectChange: (subjectUrn: string, subjectLegacyUrn?: string) => void;
}

export const PolicySubjectsOrg = ({
  ccrSubjects,
  altinnSubjects,
  otherSubjects,
  accessPackages,
  handleSubjectChange,
}: PolicySubjectsOrgProps) => {
  const { t } = useTranslation();
  const { policyRule } = usePolicyRuleContext();
  // The subject lists are large, so they are only rendered while visible
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>(TabId.ErRoles);

  return (
    <StudioDetails
      data-color='neutral'
      onToggle={(event: Event) => setIsOpen((event.target as HTMLDetailsElement).open)}
    >
      <StudioDetails.Summary className={classes.orgAccordion}>
        <Buildings3Icon fontSize={28} /> {t('policy_editor.org_subjects_header')}
      </StudioDetails.Summary>
      <StudioDetails.Content className={classes.subjectBlock}>
        {isOpen && (
          <StudioTabs value={activeTab} onChange={setActiveTab}>
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
              {activeTab === TabId.ErRoles && (
                <RoleList
                  selectedSubjects={policyRule.subject}
                  subjects={ccrSubjects}
                  heading={t('policy_editor.rule_card_subjects_ccr_roles')}
                  handleChange={handleSubjectChange}
                />
              )}
            </StudioTabs.Panel>
            <StudioTabs.Panel value={TabId.AccessPackages}>
              {activeTab === TabId.AccessPackages && (
                <PolicyAccessPackages accessPackages={accessPackages} />
              )}
            </StudioTabs.Panel>
            <StudioTabs.Panel value={TabId.AltinnRoles}>
              {activeTab === TabId.AltinnRoles && (
                <RoleList
                  selectedSubjects={policyRule.subject}
                  subjects={altinnSubjects}
                  heading={t('policy_editor.rule_card_subjects_altinn_roles')}
                  handleChange={handleSubjectChange}
                />
              )}
            </StudioTabs.Panel>
            <StudioTabs.Panel value={TabId.Other}>
              {activeTab === TabId.Other && (
                <RoleList
                  selectedSubjects={policyRule.subject}
                  subjects={otherSubjects}
                  heading={t('policy_editor.rule_card_subjects_other_roles')}
                  handleChange={handleSubjectChange}
                />
              )}
            </StudioTabs.Panel>
          </StudioTabs>
        )}
      </StudioDetails.Content>
    </StudioDetails>
  );
};
