import React, { useState } from 'react';
import classes from './ResourceContactPointFields.module.css';
import type { ResourceContactPoint } from 'app-shared/types/ResourceAdm';
import { Button } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import { ResourceContactPointFieldset } from './ResourceContactPointFieldset';

// Empty value for when adding a new field
const emptyContactPoint: ResourceContactPoint = {
  email: '',
  category: '',
  telephone: '',
  contactPage: '',
};

type ResourceContactPointFieldsProps = {
  /**
   * The current contact point list
   */
  contactPointList: ResourceContactPoint[];
  /**
   * Function to be executed when clicking add new contact point
   * @param contactPoints the updated list of contact points
   * @returns void
   */
  onClickAddMoreContactPoint: (contactPoints: ResourceContactPoint[]) => void;
  /**
   * Function to be executed when leaving the textfields
   * @param contactPoints the updated list of contact points
   * @returns void
   */
  onLeaveTextFields: (contactPoints: ResourceContactPoint[]) => void;
  /**
   * If the error should be shown
   */
  showErrors: boolean;
};

/**
 * @component
 *    Renders the list of contact points as groups with the input fields
 *
 * TODO - Find out if each fieldset should be removalbe. Issue: #10987
 *
 * @property {ResourceContactPoint[]}[contactPointList] - The current contact point list
 * @property {function}[onClickAddMoreContactPoint] - Function to be executed when clicking add new contact point
 * @property {function}[onLeaveTextFields] - Function to be executed when leaving the textfields
 * @property {boolean}[showErrors] - Function to be executed when leaving a text field
 *
 * @returns {React.ReactNode} - The rendered component
 */
export const ResourceContactPointFields = ({
  contactPointList,
  onClickAddMoreContactPoint,
  onLeaveTextFields,
  showErrors,
}: ResourceContactPointFieldsProps): React.ReactNode => {
  const { t } = useTranslation();

  const [contactPoints, setContactPoints] = useState<ResourceContactPoint[]>(
    contactPointList ?? [emptyContactPoint]
  );

  /**
   * Adds the contact point to the list
   */
  const handleClickAddButton = () => {
    setContactPoints((cp) => [...cp, emptyContactPoint]);
    onClickAddMoreContactPoint(contactPoints);
  };

  /**
   * Updates the contact points when leaving a field
   * @param contactPoint
   * @param pos
   */
  const handleLeaveTextFields = (contactPoint: ResourceContactPoint, pos: number) => {
    const updatedList = [...contactPoints];
    updatedList[pos] = contactPoint;
    setContactPoints(updatedList);
    onLeaveTextFields(updatedList);
  };

  /**
   * Displays each contact point as a group of 4 elements
   */
  const displayContactFields = contactPoints.map(
    (contactPoint: ResourceContactPoint, pos: number) => (
      <ResourceContactPointFieldset
        contactPoint={contactPoint}
        key={pos}
        onLeaveTextFields={(cp: ResourceContactPoint) => handleLeaveTextFields(cp, pos)}
        showErrors={showErrors}
      />
    )
  );

  return (
    <>
      <div className={classes.divider} />
      {displayContactFields}
      <div className={classes.buttonWrapper}>
        <Button size='small' onClick={handleClickAddButton}>
          {t('resourceadm.about_resource_contact_add_button')}
        </Button>
      </div>
    </>
  );
};
