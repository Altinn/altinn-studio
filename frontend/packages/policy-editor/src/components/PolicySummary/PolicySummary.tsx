import { usePolicyEditorContext } from '../../contexts/PolicyEditorContext';
import React from 'react';
import { StudioAlert, StudioHeading, StudioParagraph, StudioTable } from '@studio/components';
import { PolicyRuleSubjectSummary } from './PolicyRuleSummary/PolicyRuleSubjectSummary';
import { useTranslation } from 'react-i18next';
import { extractAllUniqueActions, extractAllUniqueSubjects } from '../../utils/AppPolicyUtils';
import { FeedbackForm } from './FeedbackForm/FeedbackForm';
import classes from './PolicySummary.module.css';

export function PolicySummary(): React.ReactElement {
  const { policyRules } = usePolicyEditorContext();
  const { t } = useTranslation();

  return (
    <div>
      <StudioHeading spacing={true} level={4} size='xs'>
        {t('policy_editor.summary_heading')}
      </StudioHeading>
      <StudioAlert severity='info' title='Tilbakemelding' className={classes.feedbackAlert}>
        <StudioParagraph size='small' spacing={true}>
          {t('feedback.general_request')}
        </StudioParagraph>
        <div className={classes.feedbackFormWrapper}>
          <FeedbackForm />
        </div>
      </StudioAlert>
      <StudioParagraph spacing={true}>{t('policy_editor.summary_info_about')}</StudioParagraph>
      <StudioParagraph spacing={true}>{t('policy_editor.summary_info_edit')}</StudioParagraph>
      <StudioTable>
        <StudioTable.Head>
          <StudioTable.Row>
            <StudioTable.HeaderCell>
              {t('policy_editor.summary_table.header_rolecode')}
            </StudioTable.HeaderCell>
            <StudioTable.HeaderCell>
              {t('policy_editor.summary_table.header_rolename')}
            </StudioTable.HeaderCell>
            <StudioTable.HeaderCell>
              {t('policy_editor.summary_table.header_rolecategory')}
            </StudioTable.HeaderCell>
            {extractAllUniqueActions(policyRules).map((action) => {
              return (
                <StudioTable.HeaderCell key={action}>
                  {t(`policy_editor.action_${action}`)}
                </StudioTable.HeaderCell>
              );
            })}
          </StudioTable.Row>
        </StudioTable.Head>
        <StudioTable.Body>
          {extractAllUniqueSubjects(policyRules).map((subject) => {
            return (
              <PolicyRuleSubjectSummary
                subject={subject}
                actions={extractAllUniqueActions(policyRules)}
                key={subject}
              />
            );
          })}
        </StudioTable.Body>
      </StudioTable>
    </div>
  );
}
