import React from 'react';
import type { ResourceReference } from 'app-shared/types/ResourceAdm';
import { ResourceReferenceFieldset } from './ResourceReferenceFieldset';
import { FieldsetWrapper } from '../FieldsetWrapper';

// Empty value for when adding a new field
const emptyResourceReference: ResourceReference = {
  referenceSource: 'Default',
  reference: '',
  referenceType: 'Default',
};

export type ResourceReferenceFieldsProps = {
  /**
   * The current resource references list
   */
  resourceReferenceList: ResourceReference[];
  /**
   * Function to be executed when resource references are changed
   * @param resourceReference the updated list of resource references
   * @returns void
   */
  onResourceReferenceFieldChanged: (resourceReference: ResourceReference[]) => void;
  /**
   * If the error should be shown
   */
  showErrors: boolean;
};

/**
 * @component
 *    Renders the list of resource referencess as groups with the input and select fields
 *
 * @property {ResourceReference[]}[resourceReferenceList] - The current resource references list
 * @property {function}[onResourceReferenceFieldChanged] - Function to be executed when resource references are changed
 * @property {boolean}[showErrors] - If the error should be shown
 *
 * @returns {React.ReactNode} - The rendered component
 */
export const ResourceReferenceFields = ({
  resourceReferenceList,
  onResourceReferenceFieldChanged,
  showErrors,
}: ResourceReferenceFieldsProps): React.ReactNode => {
  return (
    <FieldsetWrapper<ResourceReference>
      list={resourceReferenceList}
      onListFieldChanged={onResourceReferenceFieldChanged}
      emptyItem={emptyResourceReference}
      translations={{
        deleteButton: 'resourceadm.about_resource_reference_delete',
        deleteHeader: 'resourceadm.about_resource_reference_delete',
        deleteConfirmation: 'resourceadm.about_resource_reference_confirm_delete',
        deleteConfirmationButton: 'resourceadm.about_resource_reference_confirm_delete_button',
        addButton: 'resourceadm.about_resource_reference_add_reference',
      }}
      renderItem={(item: ResourceReference, onChange: (changedItem: ResourceReference) => void) => {
        return (
          <ResourceReferenceFieldset
            resourceReference={item}
            onChangeResourceReferenceField={onChange}
            showErrors={showErrors}
          />
        );
      }}
    />
  );
};
