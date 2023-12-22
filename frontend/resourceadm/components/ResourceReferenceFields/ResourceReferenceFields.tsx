import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Modal } from '@digdir/design-system-react';
import classes from './ResourceReferenceFields.module.css';
import type { ResourceReference } from 'app-shared/types/ResourceAdm';
import { ResourceReferenceFieldset } from './ResourceReferenceFieldset';

const DELETE_ID_NOT_SET = -1;

// Empty value for when adding a new field
const emptyResrouceReference: ResourceReference = {
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
  const { t } = useTranslation();
  const deleteModalRef = useRef<HTMLDialogElement>(null);

  const [deleteId, setDeleteId] = useState<number>(DELETE_ID_NOT_SET);
  const [resourceReferences, setResourceReferences] = useState<ResourceReference[]>(
    resourceReferenceList ?? [emptyResrouceReference],
  );

  /**
   * Adds the resource reference to the list
   */
  const handleClickAddButton = () => {
    const updatedList = [...resourceReferences, emptyResrouceReference];
    setResourceReferences(updatedList);
    onResourceReferenceFieldChanged(updatedList);
  };

  /**
   * Removes the resource reference from the list
   */
  const handleClickRemoveButton = () => {
    const updatedList = resourceReferences.filter((_rr, index) => index !== deleteId);
    onCloseDeleteModal();
    setResourceReferences(updatedList);
    onResourceReferenceFieldChanged(updatedList);
  };

  /**
   * Updates the resource reference when leaving a field
   * @param resourceReference
   * @param pos
   */
  const onChangeResourceReferenceField = (resourceReference: ResourceReference, pos: number) => {
    const updatedList = [...resourceReferences];
    updatedList[pos] = resourceReference;
    setResourceReferences(updatedList);
    onResourceReferenceFieldChanged(updatedList);
  };

  /**
   * Closes the delete resource reference modal
   */
  const onCloseDeleteModal = (): void => {
    deleteModalRef.current?.close();
    setDeleteId(DELETE_ID_NOT_SET);
  };
  /**
   * Displays each resource reference as a group of 3 elements
   */
  const displayReferenceFields = resourceReferences.map(
    (resourceReference: ResourceReference, pos: number) => (
      <div key={`${JSON.stringify(resourceReference)}-${pos}`} className={classes.fieldset}>
        <div className={classes.divider} />
        <ResourceReferenceFieldset
          resourceReference={resourceReference}
          onChangeResourceReferenceField={(rr: ResourceReference) =>
            onChangeResourceReferenceField(rr, pos)
          }
          showErrors={showErrors}
        />
        <div className={classes.buttonWrapper}>
          <Button
            size='small'
            color='danger'
            aria-disabled={resourceReferences.length < 2}
            onClick={() => {
              if (resourceReferences.length > 1) {
                // TODO: can the last resourceReference be deleted??
                deleteModalRef.current?.showModal();
                setDeleteId(pos);
              }
            }}
          >
            {t('resourceadm.about_resource_reference_delete')}
          </Button>
        </div>
      </div>
    ),
  );

  return (
    <>
      <Modal ref={deleteModalRef} onClose={onCloseDeleteModal}>
        <Modal.Header>{t('resourceadm.about_resource_reference_delete')}</Modal.Header>
        <Modal.Content>{t('resourceadm.about_resource_reference_confirm_delete')}</Modal.Content>
        <Modal.Footer>
          <Button color='danger' size='small' onClick={handleClickRemoveButton}>
            {t('resourceadm.about_resource_reference_confirm_delete_button')}
          </Button>
          <Button size='small' variant='tertiary' onClick={onCloseDeleteModal}>
            {t('general.cancel')}
          </Button>
        </Modal.Footer>
      </Modal>
      <div className={classes.divider} />
      {displayReferenceFields}
      <Button size='small' onClick={handleClickAddButton}>
        {t('resourceadm.about_resource_reference_add_reference')}
      </Button>
    </>
  );
};
