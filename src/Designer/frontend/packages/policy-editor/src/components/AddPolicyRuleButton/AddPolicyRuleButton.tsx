import React from 'react';
import classes from './AddPolicyRuleButton.module.css';
import { PlusIcon } from 'libs/studio-icons/src';
import { Paragraph } from '@digdir/designsystemet-react';
import { usePolicyEditorContext } from '../../contexts/PolicyEditorContext';
import type { PolicyRuleResource, PolicyRuleCard } from '../../types';
import { emptyPolicyRule, createNewPolicyResource, getNewRuleId } from '../../utils';
import { useTranslation } from 'react-i18next';

export type AddPolicyRuleButtonProps = {
  onClick: () => void;
};

export const AddPolicyRuleButton = ({ onClick }: AddPolicyRuleButtonProps): React.ReactNode => {
  const { policyRules, setPolicyRules, savePolicy, usageType, resourceId, resourceType } =
    usePolicyEditorContext();
  const { t } = useTranslation();

  const handleAddCardClick = () => {
    onClick();

    const newResource: PolicyRuleResource[][] = [
      createNewPolicyResource(usageType, resourceType, resourceId),
    ];
    const newRuleId: string = getNewRuleId(policyRules);

    const newRule: PolicyRuleCard = {
      ...emptyPolicyRule,
      ruleId: newRuleId,
      resources: newResource,
    };

    const updatedRules: PolicyRuleCard[] = [...policyRules, ...[newRule]];

    setPolicyRules(updatedRules);
    savePolicy(updatedRules);
  };

  return (
    <button className={classes.button} type='button' onClick={handleAddCardClick}>
      <Paragraph size='small'>{t('policy_editor.card_button_text')}</Paragraph>
      <PlusIcon className={classes.icon} />
    </button>
  );
};
