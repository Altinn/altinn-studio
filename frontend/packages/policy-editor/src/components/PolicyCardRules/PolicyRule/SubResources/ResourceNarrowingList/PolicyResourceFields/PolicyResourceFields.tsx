import React from 'react';
import classes from './PolicyResourceFields.module.css';
import { Textfield } from '@digdir/design-system-react';
import { MultiplyIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import { StudioButton, StudioLabelAsParagraph } from '@studio/components';
import { usePolicyEditorContext } from '../../../../../../contexts/PolicyEditorContext';
import { usePolicyRuleContext } from '../../../../../../contexts/PolicyRuleContext';
import { getUpdatedRules } from '../../../../../../utils/PolicyRuleUtils';
import { type PolicyRuleResource } from '../../../../../../types';

export type PolicyResourceFieldsProps = {
  resource: PolicyRuleResource;
  canEditTypeAndId: boolean;
  resourceIndex: number;
  resourceNarrowingIndex: number;
};

export const PolicyResourceFields = ({
  resource,
  canEditTypeAndId,
  resourceIndex,
  resourceNarrowingIndex,
}: PolicyResourceFieldsProps): React.ReactNode => {
  const { t } = useTranslation();
  const { savePolicy, setPolicyRules, policyRules } = usePolicyEditorContext();
  const { policyRule } = usePolicyRuleContext();

  const handleInputChange = (field: 'id' | 'type', value: string) => {
    const updatedResources = [...policyRule.resources];
    updatedResources[resourceIndex][resourceNarrowingIndex] = {
      ...updatedResources[resourceIndex][resourceNarrowingIndex],
      [field]: value,
    };

    const updatedRules = getUpdatedRules(
      { ...policyRule, resources: updatedResources },
      policyRule.ruleId,
      policyRules,
    );
    setPolicyRules(updatedRules);
  };

  const handleBlur = () => {
    savePolicy(policyRules);
  };

  const handleRemoveNarrowingResource = () => {
    const updatedResources = [...policyRule.resources];
    updatedResources[resourceIndex].splice(resourceNarrowingIndex, 1);
    const updatedRules = getUpdatedRules(
      { ...policyRule, resources: updatedResources },
      policyRule.ruleId,
      policyRules,
    );
    setPolicyRules(updatedRules);
    savePolicy(updatedRules);
  };

  return (
    <div className={classes.wrapper}>
      <div className={classes.inputWrapper}>
        <div className={classes.textfieldWrapper}>
          {!canEditTypeAndId && (
            <StudioLabelAsParagraph spacing size='small' className={classes.label}>
              Type
            </StudioLabelAsParagraph>
          )}
          <Textfield
            value={resource.type}
            size='small'
            onChange={(e) => handleInputChange('type', e.target.value)}
            readOnly={!canEditTypeAndId}
            onBlur={handleBlur}
            aria-label={t('policy_editor.narrowing_list_field_type')}
          />
        </div>
        <div className={classes.textfieldWrapper}>
          {!canEditTypeAndId && (
            <StudioLabelAsParagraph spacing size='small' className={classes.label}>
              Id
            </StudioLabelAsParagraph>
          )}
          <Textfield
            value={resource.id}
            size='small'
            onChange={(e) => handleInputChange('id', e.target.value)}
            readOnly={!canEditTypeAndId}
            onBlur={handleBlur}
            aria-label={t('policy_editor.narrowing_list_field_id')}
          />
        </div>
      </div>
      <div className={classes.buttonWrapper}>
        {canEditTypeAndId && (
          <StudioButton
            aria-disabled={!canEditTypeAndId}
            color='danger'
            hidden={!canEditTypeAndId}
            icon={<MultiplyIcon />}
            onClick={handleRemoveNarrowingResource}
            size='small'
            title={t('policy_editor.narrowing_list_field_delete')}
            variant='tertiary'
          />
        )}
      </div>
    </div>
  );
};
