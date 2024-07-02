import React from 'react';
import type { ResourceFormError, ResourceReference } from 'app-shared/types/ResourceAdm';
import { ResourceReferenceFieldset } from './ResourceReferenceFieldset';
import { FieldsetWrapper } from '../FieldsetWrapper';
import { InputFieldErrorMessage } from '../ResourcePageInputs/InputFieldErrorMessage';

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
   * Function to be executed when the field is focused
   * @returns void
   */
  onFocus: () => void;
  /**
   * Field error messages
   */
  errors: ResourceFormError[];
  /**
   * Whether this field is required or not
   */
  required?: boolean;
};

/**
 * @component
 *    Renders the list of resource referencess as groups with the input and select fields
 *
 * @property {ResourceReference[]}[resourceReferenceList] - The current resource references list
 * @property {function}[onResourceReferenceFieldChanged] - Function to be executed when resource references are changed
 * @property {function}[onFocus] - Function to be executed when the field is focused
 * @property {ResourceFormError[]}[errors] - Field error messages
 * @property {boolean}[required] - Whether this field is required or not
 *
 * @returns {React.JSX.Element} - The rendered component
 */
export const ResourceReferenceFields = ({
  resourceReferenceList,
  onResourceReferenceFieldChanged,
  onFocus,
  errors,
  required,
}: ResourceReferenceFieldsProps): React.JSX.Element => {
  return (
    <div>
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
        renderItem={(
          item: ResourceReference,
          index: number,
          onChange: (changedItem: ResourceReference) => void,
        ) => {
          return (
            <ResourceReferenceFieldset
              resourceReference={item}
              onChangeResourceReferenceField={onChange}
              onFocus={onFocus}
              errors={errors}
              required={required}
              index={index}
            />
          );
        }}
      />
      {errors
        .filter((error) => error.index === undefined)
        .map((error, index) => (
          <InputFieldErrorMessage key={index} message={error.error} />
        ))}
    </div>
  );
};
