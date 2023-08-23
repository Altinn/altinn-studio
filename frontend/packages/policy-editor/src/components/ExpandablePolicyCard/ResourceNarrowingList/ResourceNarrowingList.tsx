import React from 'react';
import classes from './ResourceNarrowingList.module.css';
import { PolicyResourceFields } from './PolicyResourceFields';
import { ExpandablePolicyElement } from '../ExpandablePolicyElement';
import { Button } from '@digdir/design-system-react';
import { PlusIcon } from '@navikt/aksel-icons';
import type { PolicyRuleResource } from '../../../types';

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
   * Flag for if first field is editable
   */
  firstFieldEditable?: boolean;
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
 * @property {boolean}[firstFieldEditable] - Flag for if the first field is editable
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
  firstFieldEditable = false,
}: ResourceNarrowingListProps): React.ReactNode => {
  /**
   * Displays the list of resources
   */
  const displayResources = resources.map((r, i) => {
    return (
      <PolicyResourceFields
        key={i}
        isEditable={firstFieldEditable || i > 0}
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
            dashedBorder
            variant='outline'
            icon={<PlusIcon title='Legg til en innsnevring av sub-ressursen' fontSize='1.5rem' />}
          >
            Legg til en innsnevring av sub-ressursen
          </Button>
        </div>
      </ExpandablePolicyElement>
    </div>
  );
};
