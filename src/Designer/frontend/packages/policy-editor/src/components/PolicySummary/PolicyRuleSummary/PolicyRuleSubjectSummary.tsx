import React from 'react';
import { usePolicyEditorContext } from '../../../contexts/PolicyEditorContext';
import { StudioTable, StudioTag } from 'libs/studio-components-legacy/src';
import {
  getSubjectCategoryTextKey,
  getSubjectDisplayName,
  mapActionsForRoleOrAccessPackage,
} from '../../../utils/AppPolicyUtils';
import { useTranslation } from 'react-i18next';
import classes from './PolicyRuleSubjectSummary.module.css';
import { ArrayUtils } from 'libs/studio-pure-functions/src';

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

  const actionsForRole = mapActionsForRoleOrAccessPackage(policyRules, subject, usageType, t);
  const displayName = getSubjectDisplayName(subject, subjects);
  const subjectCategoryTextKey = getSubjectCategoryTextKey(subject, subjects);

  return (
    <StudioTable.Row>
      <StudioTable.Cell>{subject}</StudioTable.Cell>
      <StudioTable.Cell>{displayName}</StudioTable.Cell>
      <StudioTable.Cell>{t(subjectCategoryTextKey)}</StudioTable.Cell>
      {actions.map((action) => {
        return (
          <StudioTable.Cell key={action}>
            <div className={classes.limitationsCell}>
              {actionsForRole[action]
                ? ArrayUtils.getArrayFromString(actionsForRole[action]).map((subResource) => {
                    return (
                      <StudioTag size='sm' key={`${subject}-${action}-${subResource}`} color='info'>
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
