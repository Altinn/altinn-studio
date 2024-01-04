import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Modal } from '@digdir/design-system-react';
import classes from './FieldsetWrapper.module.css';

const DELETE_ID_NOT_SET = -1;

export type FieldsetWrapperProps<T> = {
  /**
   * The current list
   */
  list: T[];
  /**
   * Function to be executed when list is changed
   * @param list the updated list
   * @returns void
   */
  onListFieldChanged: (list: T[]) => void;
  /**
   * Translation keys for texts displayed by the wrapper
   */
  translations: {
    deleteButton: string;
    deleteHeader: string;
    deleteConfirmation: string;
    deleteConfirmationButton: string;
    addButton: string;
  };
  /**
   * List object where all values are default values
   */
  emptyItem: T;
  /**
   * Render function for rendering a list item.
   * @param listItem the list item to render
   * @param onChange function to call when item is changed. Call this function from child fieldset render on change
   */
  renderItem: (listItem: T, onChange: (item: T) => void) => React.ReactNode;
};

/**
 * @component
 *    Renders the list and calls the renderItem prop function for each list item
 *
 * @property {T[]}[list] - The current list
 * @property {function}[onListFieldChanged] - Function to be executed when list is changed
 * @property {Object}[translations] - Translation keys for texts displayed by the wrapper
 * @property {T}[emptyItem] - List object where all values are default values
 * @property {function}[renderItem] - Render function for rendering a list item.
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
   * Adds a new empty list item to the list
   */
  const handleClickAddButton = () => {
    const updatedList = [...listItems, emptyItem];
    setListItems(updatedList);
    onListFieldChanged(updatedList);
  };

  /**
   * Removes a list item in the deleteId position from the list
   */
  const handleClickRemoveButton = () => {
    const updatedList = listItems.filter((_item, index) => index !== deleteId);
    onCloseDeleteModal();
    setListItems(updatedList);
    onListFieldChanged(updatedList);
  };

  /**
   * Updates the list item when a field is changed
   * @param listItem
   * @param pos
   */
  const onChangeListItemField = (listItem: T, pos: number) => {
    const updatedList = [...listItems];
    updatedList[pos] = listItem;
    setListItems(updatedList);
    onListFieldChanged(updatedList);
  };

  /**
   * Closes the delete list item modal
   */
  const onCloseDeleteModal = (): void => {
    deleteModalRef.current?.close();
    setDeleteId(DELETE_ID_NOT_SET);
  };
  /**
   * Render each list item with renderItem() and display a delete button for each
   */
  const displayFields = listItems.map((listItem: T, pos: number) => (
    <div key={`${pos}/${listItems.length}`} className={classes.fieldset}>
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
