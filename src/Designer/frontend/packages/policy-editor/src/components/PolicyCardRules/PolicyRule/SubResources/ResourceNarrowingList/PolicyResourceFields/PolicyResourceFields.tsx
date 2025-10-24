import React from 'react';
import classes from './PolicyResourceFields.module.css';
import { MultiplyIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import { StudioTextfield } from '@studio/components-legacy';
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

  const isMultipleNarrowingResources = policyRule.resources[resourceIndex].length > 1;

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
            <StudioLabelAsParagraph data-size='sm' className={classes.label}>
              {t('policy_editor.rule_card_sub_resource_type_label')}
            </StudioLabelAsParagraph>
          )}
          <StudioTextfield
            value={resource.type}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              handleInputChange('type', event.target.value)
            }
            readOnly={!canEditTypeAndId}
            onBlur={handleBlur}
            aria-label={t('policy_editor.narrowing_list_field_type')}
          />
        </div>
        <div className={classes.textfieldWrapper}>
          {!canEditTypeAndId && (
            <StudioLabelAsParagraph data-size='sm' className={classes.label}>
              {t('policy_editor.rule_card_sub_resource_id_label')}
            </StudioLabelAsParagraph>
          )}
          <StudioTextfield
            value={resource.id}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              handleInputChange('id', event.target.value)
            }
            readOnly={!canEditTypeAndId}
            onBlur={handleBlur}
            aria-label={t('policy_editor.narrowing_list_field_id')}
          />
        </div>
      </div>
      <div className={classes.buttonWrapper}>
        {canEditTypeAndId && isMultipleNarrowingResources && (
          <StudioButton
            aria-disabled={!canEditTypeAndId}
            color-color='danger'
            hidden={!canEditTypeAndId}
            icon={<MultiplyIcon />}
            onClick={handleRemoveNarrowingResource}
            title={t('policy_editor.narrowing_list_field_delete')}
            variant='tertiary'
          />
        )}
      </div>
    </div>
  );
};
