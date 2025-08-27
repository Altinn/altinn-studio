import React from 'react';
import type { ResourceContactPoint, ResourceFormError } from 'app-shared/types/ResourceAdm';
import { ResourceContactPointFieldset } from './ResourceContactPointFieldset';
import { FieldsetWrapper } from '../FieldsetWrapper';

// Empty value for when adding a new field
const emptyContactPoint: ResourceContactPoint = {
  email: '',
  category: '',
  telephone: '',
  contactPage: '',
};

export type ResourceContactPointFieldsProps = {
  /**
   * The current contact point list
   */
  contactPointList: ResourceContactPoint[];
  /**
   * Function to be executed when leaving the textfields
   * @param contactPoints the updated list of contact points
   * @returns void
   */
  onContactPointsChanged: (contactPoints: ResourceContactPoint[]) => void;
  /**
   * List of error messages
   */
  errors: ResourceFormError[];
  /**
   * Whether this field is required or not
   */
  required?: boolean;
};

/**
 * @component
 *    Renders the list of contact points as groups with the input fields

 *
 * @property {ResourceContactPoint[]}[contactPointList] - The current contact point list
 * @property {function}[onContactPointsChanged] - Function to be executed when contact points are changed
 * @property {function}[onFocus] - Function to be executed when the field is focused
 * @property {ResourceFormError[]}[errors] - List of error messages
 * @property {boolean}[required] - Whether this field is required or not
 *
 * @returns {React.JSX.Element} - The rendered component
 */
export const ResourceContactPointFields = ({
  contactPointList,
  onContactPointsChanged,
  errors,
  required,
}: ResourceContactPointFieldsProps): React.JSX.Element => {
  return (
    <FieldsetWrapper<ResourceContactPoint>
      list={contactPointList}
      onListFieldChanged={onContactPointsChanged}
      translations={{
        deleteButton: 'resourceadm.about_resource_contact_remove_button',
        deleteHeader: 'resourceadm.about_resource_contact_remove_button',
        deleteConfirmation: 'resourceadm.about_resource_contact_confirm_remove',
        deleteConfirmationButton: 'resourceadm.about_resource_contact_confirm_remove_button',
        addButton: 'resourceadm.about_resource_contact_add_button',
      }}
      emptyItem={emptyContactPoint}
      renderItem={(
        contactPoint: ResourceContactPoint,
        index: number,
        onChange: (changedItem: ResourceContactPoint) => void,
      ) => {
        return (
          <ResourceContactPointFieldset
            contactPoint={contactPoint}
            onLeaveTextFields={onChange}
            errors={errors}
            required={required}
            index={index}
          />
        );
      }}
    />
  );
};
