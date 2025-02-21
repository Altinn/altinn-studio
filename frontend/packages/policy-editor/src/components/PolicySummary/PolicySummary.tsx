import { usePolicyEditorContext } from '../../contexts/PolicyEditorContext';
import React from 'react';
import { StudioHeading, StudioParagraph, StudioTable } from '@studio/components';
import { PolicyRuleSubjectSummary } from './PolicyRuleSummary/PolicyRuleSubjectSummary';
import { useTranslation } from 'react-i18next';
import { extractAllUniqueActions, extractAllUniqueSubjects } from '../../utils/AppPolicyUtils';

export function PolicySummary() {
  const { policyRules } = usePolicyEditorContext();
  const { t } = useTranslation();

  return (
    <div>
      <StudioHeading spacing={true} level={4} size='xs'>
        {t('policy_editor.summary_heading')}
      </StudioHeading>
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
