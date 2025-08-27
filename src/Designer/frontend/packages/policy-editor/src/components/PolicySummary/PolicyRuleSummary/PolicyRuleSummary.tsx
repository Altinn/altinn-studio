import React from 'react';
import type { PolicyRuleCard } from '../../../types';
import { useTranslation } from 'react-i18next';
import { usePolicyEditorContext } from '../../../contexts/PolicyEditorContext';
import { StudioTable, StudioTag } from '@studio/components-legacy';
import { getSubjectDisplayName, getSubResourceDisplayText } from '../../../utils/AppPolicyUtils';
import { ArrayUtils } from 'libs/studio-pure-functions/src';
import classes from './PolicyRuleSummary.module.css';

export type PolicyRuleSummaryProps = {
  policyRule: PolicyRuleCard;
  showErrors: boolean;
  ruleIndex?: number;
};

export const PolicyRuleSummary = ({ policyRule }: PolicyRuleSummaryProps): React.ReactNode => {
  const { t } = useTranslation();
  const { usageType, subjects } = usePolicyEditorContext();

  const getActionsDisplayNames = (actionList: string[]): string => {
    const translations = actionList.map((a) => {
      return t(`policy_editor.action_${a}`);
    });
    return ArrayUtils.toString(translations);
  };

  return (
    <StudioTable.Row>
      <StudioTable.Cell>{policyRule.ruleId}</StudioTable.Cell>
      <StudioTable.Cell>
        {ArrayUtils.toString(
          policyRule.resources.map((r) => getSubResourceDisplayText(r, usageType, t)),
        )}
      </StudioTable.Cell>
      <StudioTable.Cell>
        <div className={classes.subjectsCell}>
          {policyRule.subject.map((s) => {
            return (
              <StudioTag size='small' key={s} color='info'>
                {getSubjectDisplayName(s, subjects)}
              </StudioTag>
            );
          })}
        </div>
      </StudioTable.Cell>
      <StudioTable.Cell>{getActionsDisplayNames(policyRule.actions)}</StudioTable.Cell>
    </StudioTable.Row>
  );
};
