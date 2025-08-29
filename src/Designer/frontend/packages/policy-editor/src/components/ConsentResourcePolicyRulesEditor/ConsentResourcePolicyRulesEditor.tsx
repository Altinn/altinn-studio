import React, { useState, useId } from 'react';
import { useTranslation } from 'react-i18next';
import cn from 'classnames';
import { PolicyRuleContextProvider } from '../../contexts/PolicyRuleContext';
import type { PolicyError, PolicyRuleCard } from '../../types';
import { PolicySubjects } from '../PolicyCardRules/PolicyRule/PolicySubjects';
import { PolicyAccessPackages } from '../PolicyCardRules/PolicyRule/PolicyAccessPackages';
import { PolicyRuleErrorMessage } from '../PolicyCardRules/PolicyRule/PolicyRuleErrorMessage';
import { usePolicyEditorContext } from '../../contexts/PolicyEditorContext';
import { accessListSubjectSource, organizationSubject } from '../../utils';
import {
  StudioAlert,
  StudioCheckbox,
  StudioValidationMessage,
  StudioHeading,
  StudioFieldset,
  useStudioCheckboxGroup,
} from '@studio/components';
import { getUpdatedRules } from '../../utils/PolicyRuleUtils';
import classes from './ConsentResourcePolicyRulesEditor.module.css';

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
        <StudioFieldset
          legend={
            <StudioHeading data-size='xs' level={2}>
              {t('policy_editor.consent_resource_consent_header')}
            </StudioHeading>
          }
          description={t('policy_editor.consent_resource_consent_description')}
        >
          <div>
            <PolicySubjects />
            <PolicyAccessPackages />
            {showErrors && <PolicyRuleErrorMessage />}
          </div>
        </StudioFieldset>
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

  const handleSubjectChange = (newSubjects: string[], currentValue: string[]): void => {
    const newSubjectsHasOrganizationSubject = newSubjects.includes(organizationSubject.subjectId);
    const currentValueHasOrganizationSubject = currentValue.includes(organizationSubject.subjectId);

    let subjectsToSave = newSubjects;
    if (newSubjectsHasOrganizationSubject && !currentValueHasOrganizationSubject) {
      // If the organization subject is added, remove all other subjects
      subjectsToSave = [organizationSubject.subjectId];
    } else if (currentValueHasOrganizationSubject && newSubjects.length > 1) {
      // If any other subject is added while the organization subject is selected, remove the organization subject
      subjectsToSave = newSubjects.filter((subject) => subject !== organizationSubject.subjectId);
    }
    setValue(subjectsToSave);

    const updatedRules = getUpdatedRules(
      {
        ...policyRule,
        subject: subjectsToSave,
      },
      policyRule.ruleId,
      policyRules,
    );
    setPolicyRules(updatedRules);
    savePolicy(updatedRules);
  };

  const hasSubjectError = showAllErrors && policyRule.subject.length === 0;
  const { getCheckboxProps, setValue } = useStudioCheckboxGroup({
    error: hasSubjectError && t('policy_editor.consent_resource_request_consent_error'),
    value: policyRule.subject,
    onChange: handleSubjectChange,
  });

  const accessListSubjects = subjects.filter((subject) =>
    subject.subjectSource.startsWith(accessListSubjectSource),
  );

  return (
    <div className={classes.consentRuleCard}>
      <StudioFieldset
        legend={
          <StudioHeading data-size='xs' level={2}>
            {t('policy_editor.consent_resource_request_consent_header')}
          </StudioHeading>
        }
        description={t('policy_editor.consent_resource_request_consent_description')}
      >
        <div>
          <StudioCheckbox
            value={organizationSubject.subjectId}
            label={
              <span className={classes.allOrganizationsItemLabel}>
                {t('policy_editor.consent_resource_all_organizations')}
              </span>
            }
            className={cn(classes.accessListItem, classes.allOrganizationsItem)}
            {...getCheckboxProps(organizationSubject.subjectId)}
          />
          {accessListSubjects.length === 0 && (
            <StudioAlert>{t('policy_editor.consent_resource_no_access_lists')}</StudioAlert>
          )}
          {accessListSubjects.map((subject) => (
            <StudioCheckbox
              key={subject.subjectId}
              value={subject.subjectId}
              label={subject.subjectTitle}
              description={subject.subjectDescription}
              className={classes.accessListItem}
              {...getCheckboxProps(subject.subjectId)}
            />
          ))}
          {hasSubjectError && (
            <StudioValidationMessage>
              {t('policy_editor.consent_resource_request_consent_error')}
            </StudioValidationMessage>
          )}
        </div>
      </StudioFieldset>
    </div>
  );
};
