import { PolicyRuleContextProvider } from '../../contexts/PolicyRuleContext';
import type { PolicyError, PolicyRuleCard } from '../../types';
import React, { useState, useId } from 'react';
import { PolicySubjects } from '../PolicyCardRules/PolicyRule/PolicySubjects';
import { PolicyAccessPackages } from '../PolicyCardRules/PolicyRule/PolicyAccessPackages';
import { PolicyRuleErrorMessage } from '../PolicyCardRules/PolicyRule/PolicyRuleErrorMessage';
import { usePolicyEditorContext } from '../../contexts/PolicyEditorContext';
import { organizationSubject } from '../../utils';
import { StudioCheckbox, StudioHeading, StudioRadio } from '@studio/components-legacy';
import { StudioAlert } from '@studio/components';
import { getUpdatedRules } from '../../utils/PolicyRuleUtils';
import classes from './ConsentResourcePolicyRulesEditor.module.css';
import { useTranslation } from 'react-i18next';

export const ConsentResourcePolicyRulesEditor = () => {
  const { policyRules, showAllErrors } = usePolicyEditorContext();

  // consent resources can only have two rules. One for consenting, and one for request consent
  return (
    <>
      <AcceptConsentPolicyRule policyRule={policyRules[0]} showErrors={showAllErrors} />
      <RequestConsentPolicyRule policyRule={policyRules[1]} />
    </>
  );
};

type AcceptConsentPolicyRuleProps = {
  policyRule: PolicyRuleCard;
  showErrors: boolean;
};

const AcceptConsentPolicyRule = ({
  policyRule,
  showErrors,
}: AcceptConsentPolicyRuleProps): React.ReactNode => {
  const { t } = useTranslation();
  const uniqueId = useId();

  const [policyError, setPolicyError] = useState<PolicyError>({
    resourceError: policyRule.resources.length === 0,
    actionsError: policyRule.actions.length === 0,
    subjectsError: policyRule.subject.length === 0,
  });

  return (
    <PolicyRuleContextProvider
      policyRule={policyRule}
      showAllErrors={showErrors}
      uniqueId={uniqueId}
      policyError={policyError}
      setPolicyError={setPolicyError}
    >
      <div className={classes.consentRuleCard}>
        <StudioHeading size='xs'>
          {t('policy_editor.consent_resource_consent_header')}
        </StudioHeading>
        <PolicySubjects />
        <PolicyAccessPackages />
        {showErrors && <PolicyRuleErrorMessage />}
      </div>
    </PolicyRuleContextProvider>
  );
};

const ALL_ORGANIZATIONS = 'ALL_ORGANIZATIONS';
const CHOSEN_ORGANIZATIONS = 'CHOSEN_ORGANIZATIONS';
type RequestConsentPolicyRuleProps = {
  policyRule: PolicyRuleCard;
};
const RequestConsentPolicyRule = ({ policyRule }: RequestConsentPolicyRuleProps) => {
  const { t } = useTranslation();
  const { policyRules, subjects, setPolicyRules, savePolicy } = usePolicyEditorContext();

  const handleAccessListsChange = (newSubjects: string[]): void => {
    const updatedRules = getUpdatedRules(
      {
        ...policyRule,
        subject: newSubjects,
      },
      policyRule.ruleId,
      policyRules,
    );
    setPolicyRules(updatedRules);
    savePolicy(updatedRules);
  };

  const handleRequestConsentRadioChange = (newValue: string): void => {
    const newSubjectValue = newValue === ALL_ORGANIZATIONS ? [organizationSubject.subjectId] : [];
    handleAccessListsChange(newSubjectValue);
  };

  const isAllOrganizationsChecked = policyRule.subject.indexOf(organizationSubject.subjectId) > -1;
  const accessListSubjects = subjects.filter((subject) =>
    subject.subjectSource.startsWith('altinn:accesslist'),
  );

  return (
    <div className={classes.consentRuleCard}>
      <StudioRadio.Group
        onChange={handleRequestConsentRadioChange}
        value={isAllOrganizationsChecked ? ALL_ORGANIZATIONS : CHOSEN_ORGANIZATIONS}
        legend={t('policy_editor.consent_resource_request_consent_header')}
      >
        <StudioRadio value={ALL_ORGANIZATIONS}>
          {t('policy_editor.consent_resource_all_organizations')}
        </StudioRadio>
        <StudioRadio value={CHOSEN_ORGANIZATIONS}>
          {t('policy_editor.consent_resource_access_list_organizations')}
        </StudioRadio>
      </StudioRadio.Group>
      {!isAllOrganizationsChecked && (
        <>
          {accessListSubjects.length === 0 ? (
            <StudioAlert>{t('policy_editor.consent_resource_no_access_lists')}</StudioAlert>
          ) : (
            <StudioCheckbox.Group
              legend={t('policy_editor.consent_resource_access_list_header')}
              onChange={handleAccessListsChange}
              value={policyRule.subject}
              className={classes.accessLists}
            >
              {accessListSubjects.map((subject) => (
                <StudioCheckbox
                  key={subject.subjectId}
                  value={subject.subjectId}
                  description={subject.subjectDescription}
                  className={classes.accessListItem}
                >
                  {subject.subjectTitle}
                </StudioCheckbox>
              ))}
            </StudioCheckbox.Group>
          )}
        </>
      )}
    </div>
  );
};
