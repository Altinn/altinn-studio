import React from 'react';
import type { PolicyRuleCard } from '../../../types';
import { useTranslation } from 'react-i18next';
import { usePolicyEditorContext } from '../../../contexts/PolicyEditorContext';
import { StudioTable, StudioTag } from '@studio/components';
import { getSubjectDisplayName, getSubResourceDisplayText } from '../../../utils/AppPolicyUtils';

export type PolicyRuleSummaryProps = {
  policyRule: PolicyRuleCard;
  showErrors: boolean;
  ruleIndex?: number;
};

export const PolicyRuleSummary = ({ policyRule }: PolicyRuleSummaryProps): React.ReactNode => {
  const { t } = useTranslation();
  const { usageType, subjects } = usePolicyEditorContext();

  const getActionsDisplayNames = (actionList: string[]): string => {
    return actionList
      .map((a) => {
        return t(`policy_editor.action_${a}`);
      })
      .join(', ');
  };

  return (
    <StudioTable.Row>
      <StudioTable.Cell>{policyRule.ruleId}</StudioTable.Cell>
      <StudioTable.Cell>
        {policyRule.resources
          .map((r) => {
            return getSubResourceDisplayText(r, usageType, t);
          })
          .join(', ')}
      </StudioTable.Cell>
      <StudioTable.Cell>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
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
