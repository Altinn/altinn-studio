import React from 'react';
import classes from './ResourceNarrowingList.module.css';
import { PolicyResourceFields } from './PolicyResourceFields';
import { ExpandablePolicyElement } from '../ExpandablePolicyElement';
import { StudioButton } from '@studio/components';
import { PlusIcon } from '@studio/icons';
import type { PolicyRuleResource } from '../../../types';
import { useTranslation } from 'react-i18next';
import { usePolicyEditorContext } from '../../../contexts/PolicyEditorContext';

export type ResourceNarrowingListProps = {
  resources: PolicyRuleResource[];
  handleInputChange: (i: number, field: 'id' | 'type', s: string) => void;
  handleRemoveResource: (index: number) => void;
  handleClickAddResource: () => void;
  handleRemoveElement: () => void;
  handleCloneElement: () => void;
  onBlur: () => void;
};

export const ResourceNarrowingList = ({
  resources,
  handleInputChange,
  handleRemoveResource,
  handleClickAddResource,
  handleRemoveElement,
  handleCloneElement,
  onBlur,
}: ResourceNarrowingListProps): React.ReactNode => {
  const { usageType } = usePolicyEditorContext();
  const { t } = useTranslation();

  /**
   * Displays the list of resources
   */
  const displayResources = resources.map((r, i) => {
    return (
      <PolicyResourceFields
        key={i}
        canEditTypeAndId={usageType === 'app' || i > 0}
        onRemove={() => handleRemoveResource(i)}
        valueId={r.id}
        valueType={r.type}
        onChangeId={(s: string) => handleInputChange(i, 'id', s)}
        onChangeType={(s: string) => handleInputChange(i, 'type', s)}
        onBlur={onBlur}
      />
    );
  });

  /**
   * Creates a name for the resourcegroup based on the id of the resource
   */
  const getResourceName = (): string => {
    return resources.map((r) => r.id).join(' - ');
  };

  return (
    <div className={classes.wrapper}>
      <ExpandablePolicyElement
        title={getResourceName()}
        isCard={false}
        handleCloneElement={handleCloneElement}
        handleRemoveElement={handleRemoveElement}
      >
        {displayResources}
        <div className={classes.buttonWrapper}>
          <StudioButton
            type='button'
            onClick={handleClickAddResource}
            color='second'
            size='small'
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
