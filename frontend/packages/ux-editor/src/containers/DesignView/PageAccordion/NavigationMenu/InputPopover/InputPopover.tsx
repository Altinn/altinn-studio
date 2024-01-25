import type { ReactNode, ChangeEvent, KeyboardEvent } from 'react';
import React, { useState, useRef } from 'react';
import classes from './InputPopover.module.css';
import { DropdownMenu, ErrorMessage, Popover, Textfield } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import { getPageNameErrorKey } from '../../../../../utils/designViewUtils';
import { PencilIcon } from '@studio/icons';
import { StudioButton } from '@studio/components';

export type InputPopoverProps = {
  disabled: boolean;
  oldName: string;
  layoutOrder: string[];
  saveNewName: (newName: string) => void;
  onClose: () => void;
};

/**
 * @component
 *    Displays a dropdown menu item with a popover where the user can edit the name of the page
 *
 * @property {boolean}[disabled] - If the dropdown item is disabled
 * @property {string}[oldName] - The old name of the page
 * @property {string[]}[layoutOrder] - The list containing all page names
 * @property {function}[saveNewName] - Saves the new name of the page
 * @property {function}[onClose] - Function to be executed on close
 *
 * @returns {ReactNode} - The rendered component
 */
export const InputPopover = ({
  disabled,
  oldName,
  layoutOrder,
  saveNewName,
  onClose,
}: InputPopoverProps): ReactNode => {
  const { t } = useTranslation();

  const newNameRef = useRef(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState<boolean>(false);

  const [errorMessage, setErrorMessage] = useState<string>(null);
  const [newName, setNewName] = useState<string>(oldName);
  const shouldSavingBeEnabled = errorMessage === null && newName !== oldName;

  /**
   * Handles the change of the new page name. If the name exists, is empty, is too
   * long, or has a wrong format, an error is set, otherwise the value displayed is changed.
   */
  const handleOnChange = (event: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const newNameCandidate = event.target.value;
    const nameError: string = getPageNameErrorKey(newNameCandidate, oldName, layoutOrder);
    setErrorMessage(nameError === null ? null : t(nameError));
    setNewName(newNameCandidate);
  };

  const handleKeyPress = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !errorMessage && oldName !== newName) {
      saveNewName(newName);
      handleClose();
    }
  };

  const handleClose = () => {
    onClose();
    setIsEditDialogOpen(false);
  };

  return (
    <>
      <DropdownMenu.Item
        onClick={() => setIsEditDialogOpen(true)}
        id='edit-page-button'
        disabled={disabled}
        ref={newNameRef}
        aria-expanded={isEditDialogOpen}
      >
        <PencilIcon />
        {t('ux_editor.page_menu_edit')}
      </DropdownMenu.Item>
      <Popover anchorEl={newNameRef.current} open={isEditDialogOpen} onClose={handleClose}>
        <Popover.Content>
          <Textfield
            label={t('ux_editor.input_popover_label')}
            size='small'
            onChange={handleOnChange}
            onKeyDown={handleKeyPress}
            value={newName}
            error={errorMessage !== null}
          />
          <ErrorMessage className={classes.errorMessage} size='small'>
            {errorMessage}
          </ErrorMessage>
          <div className={classes.buttonContainer}>
            <StudioButton
              color='first'
              variant='primary'
              onClick={() => saveNewName(newName)}
              disabled={!shouldSavingBeEnabled}
              size='small'
            >
              {t('ux_editor.input_popover_save_button')}
            </StudioButton>
            <StudioButton
              color='second'
              variant='tertiary'
              onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                event.stopPropagation();
                handleClose();
              }}
              size='small'
            >
              {t('general.cancel')}
            </StudioButton>
          </div>
        </Popover.Content>
      </Popover>
    </>
  );
};
