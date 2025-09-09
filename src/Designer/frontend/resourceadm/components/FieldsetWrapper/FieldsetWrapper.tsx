import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import classes from './FieldsetWrapper.module.css';
import { StudioButton, StudioDialog } from '@studio/components';
import { TrashIcon, PlusIcon } from '@studio/icons';
import { ResourceAdmDialogContent } from '../ResourceAdmDialogContent/ResourceAdmDialogContent';

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
  renderItem: (listItem: T, index: number, onChange: (item: T) => void) => React.JSX.Element;
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
 * @returns {React.JSX.Element} - The rendered component
 */
export const FieldsetWrapper = <T,>({
  list,
  onListFieldChanged,
  emptyItem,
  translations,
  renderItem,
}: FieldsetWrapperProps<T>): React.JSX.Element => {
  const { t } = useTranslation();
  const deleteModalRef = useRef<HTMLDialogElement>(null);

  const [deleteId, setDeleteId] = useState<number>(DELETE_ID_NOT_SET);
  const [listItems, setListItems] = useState<T[]>(list?.length ? list : [emptyItem]);

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
      {pos > 0 && <div className={classes.divider} />}
      <div data-color='neutral' className={classes.itemWrapper}>
        {renderItem(listItem, pos, (item: T) => {
          onChangeListItemField(item, pos);
        })}
        {listItems.length > 1 && (
          <div className={classes.buttonWrapper}>
            <StudioButton
              data-color='danger'
              variant='secondary'
              icon={<TrashIcon />}
              iconPlacement='left'
              onClick={() => {
                deleteModalRef.current?.showModal();
                setDeleteId(pos);
              }}
            >
              {t(translations.deleteButton)}
            </StudioButton>
          </div>
        )}
      </div>
    </div>
  ));

  return (
    <div>
      <StudioDialog ref={deleteModalRef} onClose={onCloseDeleteModal}>
        <ResourceAdmDialogContent
          heading={t(translations.deleteHeader)}
          footer={
            <>
              <StudioButton data-color='danger' onClick={handleClickRemoveButton}>
                {t(translations.deleteConfirmationButton)}
              </StudioButton>
              <StudioButton variant='tertiary' onClick={onCloseDeleteModal}>
                {t('general.cancel')}
              </StudioButton>
            </>
          }
        >
          {t(translations.deleteConfirmation)}
        </ResourceAdmDialogContent>
      </StudioDialog>
      {displayFields}
      <StudioButton
        variant='secondary'
        icon={<PlusIcon />}
        iconPlacement='left'
        onClick={handleClickAddButton}
        className={classes.buttonWrapper}
      >
        {t(translations.addButton)}
      </StudioButton>
    </div>
  );
};
