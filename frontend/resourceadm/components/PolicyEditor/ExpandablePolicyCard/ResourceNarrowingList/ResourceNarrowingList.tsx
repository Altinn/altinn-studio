import React from 'react';
import classes from './ResourceNarrowingList.module.css';
import { PolicyResourceFields } from './PolicyResourceFields';
import { PolicyRuleResourceType } from 'resourceadm/types/global';
import { ExpandablePolicyElement } from '../ExpandablePolicyElement';
import { Button } from '@digdir/design-system-react';
import { PlusIcon } from '@navikt/aksel-icons';

interface Props {
  /**
   * The list of policy resources to display
   */
  resources: PolicyRuleResourceType[];
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
  handleDuplicateElement: () => void;
  /**
   * Function to be executed on blur
   * @returns
   */
  onBlur: () => void;
}

/**
 * @component
 *    Displays the narrowing list of the resources. The component is expandable, and
 *    has a button to add elements to the list.
 *
 * @property {PolicyRuleResourceType[]}[resources] - The list of policy resources to display
 * @property {function}[handleInputChange] - Function to update the values when the text fields changes value
 * @property {function}[handleRemoveResource] - Function that removes a resource from the list
 * @property {function}[handleClickAddResource] - Function that adds a resource to the list
 * @property {function}[handleRemoveElement] - Function to be executed when the element is to be removed
 * @property {function}[handleDuplicateElement] - Function to be executed when the element is duplicated
 * @property {function}[onBlur] - Function to be executed on blur
 *
 * @returns {React.ReactNode} - The rendered component
 */
export const ResourceNarrowingList = ({
  resources,
  handleInputChange,
  handleRemoveResource,
  handleClickAddResource,
  handleRemoveElement,
  handleDuplicateElement,
  onBlur,
}: Props): React.ReactNode => {
  /**
   * Displays the list of resources
   */
  const displayResources = resources.map((r, i) => {
    return (
      <PolicyResourceFields
        key={i}
        isEditable={i > 0}
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
        handleDuplicateElement={handleDuplicateElement}
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
