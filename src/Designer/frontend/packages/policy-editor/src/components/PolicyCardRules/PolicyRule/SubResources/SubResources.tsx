import React from 'react';
import classes from './SubResources.module.css';
import { StudioButton, StudioLabelAsParagraph } from 'libs/studio-components-legacy/src';
import { PlusIcon } from 'libs/studio-icons/src';
import { ResourceNarrowingList } from './ResourceNarrowingList';
import { useTranslation } from 'react-i18next';
import { createNewPolicyResource } from '../../../../utils';
import { usePolicyEditorContext } from '../../../../contexts/PolicyEditorContext';
import { usePolicyRuleContext } from '../../../../contexts/PolicyRuleContext';
import { getUpdatedRules } from '../../../../utils/PolicyRuleUtils';
import type { PolicyRuleResource } from '../../../../types';
import { ErrorMessage } from '@digdir/designsystemet-react';

export const SubResources = (): React.ReactElement => {
  const { t } = useTranslation();
  const {
    policyRules: rules,
    setPolicyRules,
    usageType,
    resourceType,
    resourceId,
    savePolicy,
  } = usePolicyEditorContext();

  const { policyRule, setPolicyError, policyError, showAllErrors } = usePolicyRuleContext();

  const handleClickAddResource = () => {
    const newResource: PolicyRuleResource[] = createNewPolicyResource(
      usageType,
      resourceType,
      resourceId,
    );

    const updatedResources = [...policyRule.resources, newResource];
    const updatedRules = getUpdatedRules(
      { ...policyRule, resources: updatedResources },
      policyRule.ruleId,
      rules,
    );
    setPolicyRules(updatedRules);
    savePolicy(updatedRules);
    setPolicyError({ ...policyError, resourceError: false });
  };

  const displayResources = policyRule.resources.map((r, i) => {
    return (
      <ResourceNarrowingList key={policyRule.ruleId + '-' + i} resources={r} resourceIndex={i} />
    );
  });

  return (
    <>
      <StudioLabelAsParagraph className={classes.label} size='small'>
        {t('policy_editor.rule_card_sub_resource_title')}
      </StudioLabelAsParagraph>
      {displayResources}
      <div className={classes.addResourceButton}>
        <StudioButton
          type='button'
          onClick={handleClickAddResource}
          color='second'
          fullWidth
          icon={<PlusIcon fontSize='1.5rem' />}
        >
          {t('policy_editor.rule_card_sub_resource_button')}
        </StudioButton>
      </div>
      {showAllErrors && policyError.resourceError && (
        <ErrorMessage size='small'>{t('policy_editor.rule_card_sub_resource_error')}</ErrorMessage>
      )}
    </>
  );
};
