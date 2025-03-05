import React from 'react';
import { usePolicyEditorContext } from '../../../contexts/PolicyEditorContext';
import { StudioTable, StudioTag } from '@studio/components';
import {
  getSubjectCategoryTextKey,
  getSubjectDisplayName,
  mapActionsForRole,
} from '../../../utils/AppPolicyUtils';
import { useTranslation } from 'react-i18next';
import classes from './PolicyRuleSubjectSummary.module.css';
import { ArrayUtils } from '@studio/pure-functions';

export type PolicyRuleSubjectSummaryProps = {
  subject: string;
  actions: string[];
};

export const PolicyRuleSubjectSummary = ({
  subject,
  actions,
}: PolicyRuleSubjectSummaryProps): React.ReactNode => {
  const { usageType, subjects, policyRules } = usePolicyEditorContext();
  const { t } = useTranslation();

  const actionsForRole = mapActionsForRole(policyRules, subject, usageType, t);

  return (
    <StudioTable.Row>
      <StudioTable.Cell>{subject}</StudioTable.Cell>
      <StudioTable.Cell>{getSubjectDisplayName(subject, subjects)}</StudioTable.Cell>
      <StudioTable.Cell>{t(getSubjectCategoryTextKey(subject, subjects))}</StudioTable.Cell>
      {actions.map((action) => {
        return (
          <StudioTable.Cell key={action}>
            <div className={classes.limitationsCell}>
              {actionsForRole[action]
                ? ArrayUtils.getArrayFromString(actionsForRole[action]).map((subResource) => {
                    return (
                      <StudioTag
                        size='small'
                        key={`${subject}-${action}-${subResource}`}
                        color='info'
                      >
                        {subResource}
                      </StudioTag>
                    );
                  })
                : '-'}
            </div>
          </StudioTable.Cell>
        );
      })}
    </StudioTable.Row>
  );
};
