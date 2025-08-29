import { usePolicyEditorContext } from '../../contexts/PolicyEditorContext';
import React from 'react';
import { StudioHeading, StudioTable } from '@studio/components-legacy';
import { StudioAlert, StudioParagraph } from '@studio/components';
import { PolicyRuleSubjectSummary } from './PolicyRuleSummary/PolicyRuleSubjectSummary';
import { useTranslation } from 'react-i18next';
import {
  extractAllUniqueActions,
  extractAllUniqueAccessPackages,
  extractAllUniqueSubjects,
} from '../../utils/AppPolicyUtils';
import { FeedbackForm } from './FeedbackForm/FeedbackForm';
import classes from './PolicySummary.module.css';
import { PolicyRuleAccessPackageSummary } from './PolicyRuleSummary/PolicyRuleAccessPackageSummary';
import type { PolicyRuleCard } from '../../types';

export function PolicySummary(): React.ReactElement {
  const { policyRules } = usePolicyEditorContext();
  const { t } = useTranslation();

  return (
    <div>
      <StudioHeading spacing={true} level={4} size='xs'>
        {t('policy_editor.summary_heading')}
      </StudioHeading>
      <StudioAlert data-color='info' title={t('feedback.title')} className={classes.feedbackAlert}>
        <StudioParagraph spacing>{t('feedback.general_request')}</StudioParagraph>
        <div className={classes.feedbackFormWrapper}>
          <FeedbackForm />
        </div>
      </StudioAlert>
      <StudioParagraph spacing>{t('policy_editor.summary_info_about')}</StudioParagraph>
      <StudioParagraph spacing>{t('policy_editor.summary_info_edit')}</StudioParagraph>
      <StudioTable>
        <PolicySummaryTableHead uniqueActions={extractAllUniqueActions(policyRules)} />
        <PolicySummaryTableBody
          policyRules={policyRules}
          uniqueActions={extractAllUniqueActions(policyRules)}
        />
      </StudioTable>
    </div>
  );
}

function PolicySummaryTableHead({
  uniqueActions,
}: {
  uniqueActions: string[];
}): React.ReactElement {
  const { t } = useTranslation();
  return (
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
        {uniqueActions.map((action) => {
          return (
            <StudioTable.HeaderCell key={action}>
              {t(`policy_editor.action_${action}`)}
            </StudioTable.HeaderCell>
          );
        })}
      </StudioTable.Row>
    </StudioTable.Head>
  );
}

type PolicySummaryTableBodyProps = {
  policyRules: PolicyRuleCard[];
  uniqueActions: string[];
};

function PolicySummaryTableBody({
  policyRules,
  uniqueActions,
}: PolicySummaryTableBodyProps): React.ReactElement {
  return (
    <StudioTable.Body>
      <PolicySummaryAccessPackageRows
        uniqueAccessPackages={extractAllUniqueAccessPackages(policyRules)}
        uniqueActions={uniqueActions}
      />
      <PolicySummarySubjectRows
        uniqueSubjects={extractAllUniqueSubjects(policyRules)}
        uniqueActions={uniqueActions}
      />
    </StudioTable.Body>
  );
}

function PolicySummarySubjectRows({
  uniqueSubjects,
  uniqueActions,
}: {
  uniqueSubjects: string[];
  uniqueActions: string[];
}): React.ReactElement {
  return (
    <>
      {uniqueSubjects.map((subject) => {
        return <PolicyRuleSubjectSummary subject={subject} actions={uniqueActions} key={subject} />;
      })}
    </>
  );
}

function PolicySummaryAccessPackageRows({
  uniqueAccessPackages,
  uniqueActions,
}: {
  uniqueAccessPackages: string[];
  uniqueActions: string[];
}): React.ReactElement {
  return (
    <>
      {uniqueAccessPackages.map((accessPackage) => {
        return (
          <PolicyRuleAccessPackageSummary
            accessPackage={accessPackage}
            actions={uniqueActions}
            key={accessPackage}
          />
        );
      })}
    </>
  );
}
