import React, { useRef, useState } from 'react';
import classes from './ResourceContactPointFields.module.css';
import type { ResourceContactPoint } from 'app-shared/types/ResourceAdm';
import { Button, Modal } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import { ResourceContactPointFieldset } from './ResourceContactPointFieldset';

const DELETE_ID_NOT_SET = -1;

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
  const { t } = useTranslation();
  const deleteModalRef = useRef<HTMLDialogElement>(null);

  const [deleteId, setDeleteId] = useState<number>(DELETE_ID_NOT_SET);
  const [contactPoints, setContactPoints] = useState<ResourceContactPoint[]>(
    contactPointList ?? [emptyContactPoint],
  );

  /**
   * Adds the contact point to the list
   */
  const handleClickAddButton = () => {
    const updatedList = [...contactPoints, emptyContactPoint];
    setContactPoints(updatedList);
    onContactPointsChanged(contactPoints);
  };

  /**
   * Removes the contact point from the list
   */
  const handleClickRemoveButton = () => {
    const updatedList = contactPoints.filter((_cp, index) => index !== deleteId);
    onCloseDeleteModal();
    setContactPoints(updatedList);
    onContactPointsChanged(updatedList);
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
    onContactPointsChanged(updatedList);
  };

  /**
   * Closes the delete contact point modal
   */
  const onCloseDeleteModal = (): void => {
    deleteModalRef.current?.close();
    setDeleteId(DELETE_ID_NOT_SET);
  };
  /**
   * Displays each contact point as a group of 4 elements
   */
  const displayContactFields = contactPoints.map(
    (contactPoint: ResourceContactPoint, pos: number) => (
      <div key={JSON.stringify(contactPoint)}>
        <ResourceContactPointFieldset
          contactPoint={contactPoint}
          onLeaveTextFields={(cp: ResourceContactPoint) => handleLeaveTextFields(cp, pos)}
          showErrors={showErrors}
        />
        <Button
          size='small'
          color='danger'
          aria-disabled={contactPoints.length < 2}
          onClick={() => {
            if (contactPoints.length > 1) {
              deleteModalRef.current?.showModal();
              setDeleteId(pos);
            }
          }}
        >
          {t('resourceadm.about_resource_contact_remove_button')}
        </Button>
      </div>
    ),
  );

  return (
    <>
      <Modal ref={deleteModalRef} onClose={onCloseDeleteModal}>
        <Modal.Header>{t('resourceadm.about_resource_contact_remove_button')}</Modal.Header>
        <Modal.Content>{t('resourceadm.about_resource_contact_confirm_remove')}</Modal.Content>
        <Modal.Footer>
          <Button color='danger' size='small' onClick={handleClickRemoveButton}>
            {t('resourceadm.about_resource_contact_confirm_remove_button')}
          </Button>
          <Button size='small' variant='tertiary' onClick={onCloseDeleteModal}>
            {t('general.cancel')}
          </Button>
        </Modal.Footer>
      </Modal>
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
