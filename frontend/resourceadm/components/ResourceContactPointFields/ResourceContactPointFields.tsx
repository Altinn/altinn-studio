import React from 'react';
import type { ResourceContactPoint } from 'app-shared/types/ResourceAdm';
import { ResourceContactPointFieldset } from './ResourceContactPointFieldset';
import { FieldsetWrapper } from '../FieldsetWrapper/FieldsetWrapper';

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
   * If the error should be shown
   */
  showErrors: boolean;
};

/**
 * @component
 *    Renders the list of contact points as groups with the input fields

 *
 * @property {ResourceContactPoint[]}[contactPointList] - The current contact point list
 * @property {function}[onContactPointsChanged] - Function to be executed when contact points are changed
 * @property {boolean}[showErrors] - If the error should be shown
 *
 * @returns {React.ReactNode} - The rendered component
 */
export const ResourceContactPointFields = ({
  contactPointList,
  onContactPointsChanged,
  showErrors,
}: ResourceContactPointFieldsProps): React.ReactNode => {
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
        onChange: (changedItem: ResourceContactPoint) => void,
      ) => {
        return (
          <ResourceContactPointFieldset
            contactPoint={contactPoint}
            onLeaveTextFields={onChange}
            showErrors={showErrors}
          />
        );
      }}
    />
  );
};
