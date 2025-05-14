import { PolicyRuleContextProvider } from '../../contexts/PolicyRuleContext';
import type { PolicyError, PolicyRuleCard } from '../../types';
import React, { useState, useId } from 'react';
import { PolicySubjects } from '../PolicyCardRules/PolicyRule/PolicySubjects';
import { PolicyAccessPackages } from '../PolicyCardRules/PolicyRule/PolicyAccessPackages';
import { PolicyRuleErrorMessage } from '../PolicyCardRules/PolicyRule/PolicyRuleErrorMessage';
import { usePolicyEditorContext } from '../../contexts/PolicyEditorContext';
import { organizationSubject } from '../../utils';
import { StudioCheckbox, StudioErrorMessage, StudioHeading } from '@studio/components-legacy';
import { StudioAlert } from '@studio/components';
import { getUpdatedRules } from '../../utils/PolicyRuleUtils';
import classes from './ConsentResourcePolicyRulesEditor.module.css';
import { useTranslation } from 'react-i18next';

export const ConsentResourcePolicyRulesEditor = () => {
  const { policyRules, showAllErrors } = usePolicyEditorContext();

  // consent resources can only have two rules. One for consenting, and one for request consent
  return (
    <>
      <RequestConsentPolicyRule policyRule={policyRules[0]} />
      <AcceptConsentPolicyRule policyRule={policyRules[1]} showErrors={showAllErrors} />
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
        <StudioHeading size='xs' level={2}>
          {t('policy_editor.consent_resource_consent_header')}
        </StudioHeading>
        <PolicySubjects />
        <PolicyAccessPackages />
        {showErrors && <PolicyRuleErrorMessage />}
      </div>
    </PolicyRuleContextProvider>
  );
};

type RequestConsentPolicyRuleProps = {
  policyRule: PolicyRuleCard;
};
const RequestConsentPolicyRule = ({ policyRule }: RequestConsentPolicyRuleProps) => {
  const { t } = useTranslation();
  const { policyRules, subjects, setPolicyRules, savePolicy, showAllErrors } =
    usePolicyEditorContext();

  const handleAccessListsChange = (newSubjects: string[]): void => {
    // TODO: kan man velge både tilgangsliste og "alle organisasjoner"?
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

  const accessListSubjects = subjects.filter((subject) =>
    subject.subjectSource.startsWith('altinn:accesslist'),
  );

  return (
    <div className={classes.consentRuleCard}>
      <StudioCheckbox.Group
        legend={
          <StudioHeading size='xs' level={1}>
            {t('policy_editor.consent_resource_request_consent_header')}
          </StudioHeading>
        }
        onChange={handleAccessListsChange}
        value={policyRule.subject}
        error={
          showAllErrors &&
          policyRule.subject.length === 0 && (
            <StudioErrorMessage size='small'>
              {t('policy_editor.consent_resource_request_consent_error')}
            </StudioErrorMessage>
          )
        }
      >
        <StudioCheckbox
          value={organizationSubject.subjectId}
          description={t('policy_editor.consent_resource_all_organizations_description')}
          className={classes.accessListItem}
        >
          {t('policy_editor.consent_resource_all_organizations')}
        </StudioCheckbox>
        {accessListSubjects.length === 0 && (
          <StudioAlert>{t('policy_editor.consent_resource_no_access_lists')}</StudioAlert>
        )}
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
    </div>
  );
};
