import React from 'react';
import classes from './ResourceNarrowingList.module.css';
import { PolicyResourceFields } from './PolicyResourceFields';
import { ExpandablePolicyElement } from '../../ExpandablePolicyElement';
import { StudioButton } from '@studio/components';
import { PlusIcon } from '@studio/icons';
import type { PolicyRuleResource } from '../../../../../types';
import { useTranslation } from 'react-i18next';
import { usePolicyEditorContext } from '../../../../../contexts/PolicyEditorContext';
import { usePolicyRuleContext } from '../../../../../contexts/PolicyRuleContext';
import { getUpdatedRules } from '../../../../../utils/PolicyRuleUtils';
import { ObjectUtils } from '@studio/pure-functions';

export type ResourceNarrowingListProps = {
  resources: PolicyRuleResource[];
  resourceIndex: number;
};

export const ResourceNarrowingList = ({
  resources,
  resourceIndex,
}: ResourceNarrowingListProps): React.ReactNode => {
  const { usageType, setPolicyRules, policyRules, savePolicy } = usePolicyEditorContext();
  const { policyRule, setPolicyError, policyError } = usePolicyRuleContext();

  const { t } = useTranslation();

  const handleDeleteResourceGroup = () => {
    const updatedResources = [...policyRule.resources];
    updatedResources.splice(resourceIndex, 1);
    updatePolicyStates(updatedResources);
    setPolicyError({ ...policyError, resourceError: updatedResources.length === 0 });
  };

  const handleCloneResourceGroup = () => {
    const resourceGroupToDuplicate: PolicyRuleResource[] = policyRule.resources[resourceIndex];
    const deepCopiedResourceGroupToDuplicate: PolicyRuleResource[] =
      ObjectUtils.deepCopy(resourceGroupToDuplicate);

    const updatedResources = [...policyRule.resources, deepCopiedResourceGroupToDuplicate];
    updatePolicyStates(updatedResources);
  };

  const handleClickAddResourceNarrowing = () => {
    const newResource: PolicyRuleResource = {
      type: '',
      id: '',
    };
    const updatedResources = [...policyRule.resources];
    updatedResources[resourceIndex].push(newResource);
    updatePolicyStates(updatedResources);
  };

  const updatePolicyStates = (updatedResources: PolicyRuleResource[][]) => {
    const updatedRules = getUpdatedRules(
      { ...policyRule, resources: updatedResources },
      policyRule.ruleId,
      policyRules,
    );
    setPolicyRules(updatedRules);
    savePolicy(updatedRules);
  };

  const displayResources = resources.map((resource: PolicyRuleResource, i) => {
    return (
      <PolicyResourceFields
        key={i}
        resource={resource}
        canEditTypeAndId={usageType === 'app' || i > 0}
        resourceIndex={resourceIndex}
        resourceNarrowingIndex={i}
      />
    );
  });

  const getResourceName = (): string => {
    return resources.map((r) => r.id).join(' - ');
  };

  return (
    <div className={classes.wrapper}>
      <ExpandablePolicyElement
        title={getResourceName()}
        isCard={false}
        handleCloneElement={handleCloneResourceGroup}
        handleRemoveElement={handleDeleteResourceGroup}
      >
        {displayResources}
        <div className={classes.buttonWrapper}>
          <StudioButton
            type='button'
            onClick={handleClickAddResourceNarrowing}
            variant='secondary'
            icon={<PlusIcon fontSize='1.5rem' />}
          >
            {t('policy_editor.narrowing_list_add_button')}
          </StudioButton>
        </div>
      </ExpandablePolicyElement>
    </div>
  );
};
