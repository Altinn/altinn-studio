import React from 'react';
import classes from './PolicyDescription.module.css';
import { usePolicyEditorContext } from '../../../../contexts/PolicyEditorContext';
import { usePolicyRuleContext } from '../../../../contexts/PolicyRuleContext';
import { getUpdatedRules } from '../../../../utils/PolicyRuleUtils';
import { useTranslation } from 'react-i18next';
import { StudioTextarea } from '@studio/components';

export const PolicyDescription = (): React.ReactElement => {
  const { t } = useTranslation();
  const { policyRules, setPolicyRules, savePolicy } = usePolicyEditorContext();
  const { policyRule, uniqueId } = usePolicyRuleContext();

  const handleChangeDescription = (event: React.FormEvent<HTMLTextAreaElement>) => {
    const description: string = event.currentTarget.value;
    const updatedRules = getUpdatedRules(
      { ...policyRule, description },
      policyRule.ruleId,
      policyRules,
    );
    setPolicyRules(updatedRules);
  };

  return (
    <div className={classes.textAreaWrapper}>
      <StudioTextarea
        label={t('policy_editor.rule_card_description_title')}
        value={policyRule.description}
        onChange={handleChangeDescription}
        rows={5}
        onBlur={() => savePolicy(policyRules)}
        id={`description-${uniqueId}`}
        className={classes.descriptionInput}
      />
    </div>
  );
};
