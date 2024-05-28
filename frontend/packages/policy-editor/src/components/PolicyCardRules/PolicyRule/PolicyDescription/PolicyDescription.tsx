import React from 'react';
import classes from './PolicyDescription.module.css';
import { usePolicyEditorContext } from '../../../../contexts/PolicyEditorContext';
import { usePolicyRuleContext } from '../../../../contexts/PolicyRuleContext';
import { getUpdatedRules } from '../../../../utils/PolicyRuleUtils';
import { Textarea } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';

export const PolicyDescription = () => {
  const { t } = useTranslation();
  const { policyRules, setPolicyRules, savePolicy } = usePolicyEditorContext();
  const { policyRule, uniqueId } = usePolicyRuleContext();

  const handleChangeDescription = (description: string) => {
    const updatedRules = getUpdatedRules(
      { ...policyRule, description },
      policyRule.ruleId,
      policyRules,
    );
    setPolicyRules(updatedRules);
  };

  return (
    <div className={classes.textAreaWrapper}>
      <Textarea
        label={t('policy_editor.rule_card_description_title')}
        size='small'
        value={policyRule.description}
        onChange={(e) => handleChangeDescription(e.currentTarget.value)}
        rows={5}
        onBlur={() => savePolicy(policyRules)}
        id={`description-${uniqueId}`}
        className={classes.descriptionInput}
      />
    </div>
  );
};
