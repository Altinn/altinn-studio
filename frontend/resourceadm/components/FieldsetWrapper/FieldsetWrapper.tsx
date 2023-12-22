import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Modal } from '@digdir/design-system-react';
import classes from './FieldsetWrapper.module.css';

const DELETE_ID_NOT_SET = -1;

export type FieldsetWrapperProps<T> = {
  /**
   * The current resource references list
   */
  list: T[];
  /**
   * Function to be executed when resource references are changed
   * @param resourceReference the updated list of resource references
   * @returns void
   */
  onListFieldChanged: (listItem: T[]) => void;
  /**
   * If the error should be shown
   */
  translations: {
    deleteButton: string;
    deleteHeader: string;
    deleteConfirmation: string;
    deleteConfirmationButton: string;
    addButton: string;
  };
  emptyItem: T;
  renderItem: (listItem: T, onChange: (res: T) => void) => React.ReactNode;
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
export const FieldsetWrapper = <T,>({
  list,
  onListFieldChanged,
  emptyItem,
  translations,
  renderItem,
}: FieldsetWrapperProps<T>): React.ReactNode => {
  const { t } = useTranslation();
  const deleteModalRef = useRef<HTMLDialogElement>(null);

  const [deleteId, setDeleteId] = useState<number>(DELETE_ID_NOT_SET);
  const [listItems, setListItems] = useState<T[]>(list ?? [emptyItem]);

  /**
   * Adds the resource reference to the list
   */
  const handleClickAddButton = () => {
    const updatedList = [...listItems, emptyItem];
    setListItems(updatedList);
    onListFieldChanged(updatedList);
  };

  /**
   * Removes the resource reference from the list
   */
  const handleClickRemoveButton = () => {
    const updatedList = listItems.filter((_item, index) => index !== deleteId);
    onCloseDeleteModal();
    setListItems(updatedList);
    onListFieldChanged(updatedList);
  };

  /**
   * Updates the resource reference when leaving a field
   * @param resourceReference
   * @param pos
   */
  const onChangeListItemField = (listItem: T, pos: number) => {
    const updatedList = [...listItems];
    updatedList[pos] = listItem;
    setListItems(updatedList);
    onListFieldChanged(updatedList);
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
  const displayFields = listItems.map((listItem: T, pos: number) => (
    <div key={`${JSON.stringify(listItem)}-${pos}`} className={classes.fieldset}>
      <div className={classes.divider} />
      {renderItem(listItem, (item: T) => {
        onChangeListItemField(item, pos);
      })}
      <div className={classes.buttonWrapper}>
        <Button
          size='small'
          color='danger'
          aria-disabled={listItems.length < 2}
          onClick={() => {
            if (listItems.length > 1) {
              // TODO: can the last item be deleted??
              deleteModalRef.current?.showModal();
              setDeleteId(pos);
            }
          }}
        >
          {t(translations.deleteButton)}
        </Button>
      </div>
    </div>
  ));

  return (
    <>
      <Modal ref={deleteModalRef} onClose={onCloseDeleteModal}>
        <Modal.Header>{t(translations.deleteHeader)}</Modal.Header>
        <Modal.Content>{t(translations.deleteConfirmation)}</Modal.Content>
        <Modal.Footer>
          <Button color='danger' size='small' onClick={handleClickRemoveButton}>
            {t(translations.deleteConfirmationButton)}
          </Button>
          <Button size='small' variant='tertiary' onClick={onCloseDeleteModal}>
            {t('general.cancel')}
          </Button>
        </Modal.Footer>
      </Modal>
      <div className={classes.divider} />
      {displayFields}
      <Button size='small' onClick={handleClickAddButton}>
        {t(translations.addButton)}
      </Button>
    </>
  );
};
