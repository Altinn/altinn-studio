import React from 'react';
import classes from './ResourceNarrowingList.module.css';
import { PolicyResourceFields } from './PolicyResourceFields';
import { ExpandablePolicyElement } from '../ExpandablePolicyElement';
import { Button } from '@digdir/design-system-react';
import { PlusIcon } from '@navikt/aksel-icons';
import type { PolicyEditorUsage, PolicyRuleResource } from '../../../types';
import { useTranslation } from 'react-i18next';

type ResourceNarrowingListProps = {
  /**
   * The list of policy resources to display
   */
  resources: PolicyRuleResource[];
  /**
   * Function to update the values when the text fields changes value
   * @param i the index position
   * @param field if it is the id or the type field
   * @param s the string in the field
   * @returns void
   */
  handleInputChange: (i: number, field: 'id' | 'type', s: string) => void;
  /**
   * Function that removes a resource from the list
   * @param index the index position to remove
   * @returns void
   */
  handleRemoveResource: (index: number) => void;
  /**
   * Function that adds a resource to the list
   * @returns void
   */
  handleClickAddResource: () => void;
  /**
   * Function to be executed when the element is to be removed
   * @returns void
   */
  handleRemoveElement: () => void;
  /**
   * Function to be executed when the element is duplicated
   * @returns void
   */
  handleCloneElement: () => void;
  /**
   * Function to be executed on blur
   * @returns
   */
  onBlur: () => void;
  /**
   * The usage type of the policy editor
   */
  usageType: PolicyEditorUsage;
};

/**
 * @component
 *    Displays the narrowing list of the resources. The component is expandable, and
 *    has a button to add elements to the list.
 *
 * @property {PolicyRuleResource[]}[resources] - The list of policy resources to display
 * @property {function}[handleInputChange] - Function to update the values when the text fields changes value
 * @property {function}[handleRemoveResource] - Function that removes a resource from the list
 * @property {function}[handleClickAddResource] - Function that adds a resource to the list
 * @property {function}[handleRemoveElement] - Function to be executed when the element is to be removed
 * @property {function}[handleCloneElement] - Function to be executed when the element is cloned
 * @property {function}[onBlur] - Function to be executed on blur
 * @property {PolicyEditorUsage}[usageType] - The usage type of the policy editor
 *
 * @returns {React.ReactNode} - The rendered component
 */
export const ResourceNarrowingList = ({
  resources,
  handleInputChange,
  handleRemoveResource,
  handleClickAddResource,
  handleRemoveElement,
  handleCloneElement,
  onBlur,
  usageType,
}: ResourceNarrowingListProps): React.ReactNode => {
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
          <Button
            type='button'
            onClick={handleClickAddResource}
            color='secondary'
            size='small'
            dashedBorder
            variant='outline'
            icon={<PlusIcon title={t('policy_editor.narrowing_list_add_button')} fontSize='1.5rem' />}
          >
            {t('policy_editor.narrowing_list_add_button')}
          </Button>
        </div>
      </ExpandablePolicyElement>
    </div>
  );
};
