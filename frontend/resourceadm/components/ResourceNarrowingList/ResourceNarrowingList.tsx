import React from 'react';
import classes from './ResourceNarrowingList.module.css';
import { PolicyResourceFields } from '../PolicyResourceFields';
import { PolicyRuleResourceType } from 'resourceadm/types/global';
import { ExpandablePolicyElement } from '../ExpandablePolicyElement';
import { Button } from '@digdir/design-system-react';

interface Props {
  resources: PolicyRuleResourceType[];
  handleInputChange: (i: number, field: 'id' | 'type', s: string) => void;
  handleRemoveResource: (index: number) => void;
  handleClickAddResource: () => void;
  handleRemoveElement: () => void;
  handleDuplicateElement: () => void;
}

/**
 * Displays the narrowing list of the resources. The component is expandable, and
 * has a button to add elements to the list.
 *
 * @param props.resources the list of policy resources to display
 * @param props.handleInputChange function to update the values when the text fields changes value
 * @param props.handleRemoveResource function that removes a resource from the list
 * @param props.handleClickAddResource function that adds a resource to the list
 * @param props.handleRemoveElement function to be executed when the element is to be removed
 * @param props.handleDuplicateElement function to be executed when the element is duplicated
 */
export const ResourceNarrowingList = ({
  resources,
  handleInputChange,
  handleRemoveResource,
  handleClickAddResource,
  handleRemoveElement,
  handleDuplicateElement,
}: Props) => {
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
        <Button type='button' onClick={handleClickAddResource}>
          Legg til en innsnevring av ressursen {/* TODO - Komme med bedre navn*/}
        </Button>
      </ExpandablePolicyElement>
    </div>
  );
};
