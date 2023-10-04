import React, { ReactNode, useRef, useEffect, ChangeEvent, useState } from 'react';
import classes from './InputPopover.module.css';
import { Button, ErrorMessage, Popover, Textfield } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import { validateLayoutNameAndLayoutSetName } from '../../../../utils/validationUtils/validateLayoutNameAndLayoutSetName';

export type InputPopoverProps = {
  /**
   * The old name of the page
   */
  oldName: string;
  /**
   * The list containing all page names
   */
  layoutOrder: string[];
  /**
   * Saves the new name of the page
   * @param newName the new name to save
   * @returns void
   */
  saveNewName: (newName: string) => void;
  /**
   * Function to be executed when closing the popover
   * @param event optional mouse event
   * @returns void
   */
  onClose: (event?: React.MouseEvent<HTMLButtonElement> | MouseEvent) => void;
  /**
   * If the popover is open or not
   */
  open: boolean;
  /**
   * The component that triggers the opening of the popover
   */
  trigger: ReactNode;
};

/**
 * @component
 *    Displays a popover where the user can edit the name of the page
 *
 * @property {string}[oldName] - The old name of the page
 * @property {string[]}[layoutOrder] - The list containing all page names
 * @property {function}[saveNewName] - Saves the new name of the page
 * @property {function}[onClose] - Function to be executed when closing the popover
 * @property {boolean}[open] - If the popover is open or not
 * @property {ReactNode}[trigger] - The component that triggers the opening of the popover
 *
 * @returns {ReactNode} - The rendered component
 */
export const InputPopover = ({
  oldName,
  layoutOrder,
  saveNewName,
  onClose,
  open = false,
  trigger,
}: InputPopoverProps): ReactNode => {
  const { t } = useTranslation();

  const ref = useRef(null);

  const [errorMessage, setErrorMessage] = useState<string>('');
  const [newName, setNewName] = useState<string>(oldName);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target)) {
        onClose(event);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose, open]);

  /**
   * Checks if the new written page name already exists
   */
  const pageNameExists = (candidateName: string): boolean =>
    layoutOrder.some((p: string) => p.toLowerCase() === candidateName.toLowerCase());

  /**
   * Handles the change of the new page name. If the name exists, is empty, is too
   * long, or has a wrong format, an error is set, otherwise the value displayed is changed.
   */
  const handleOnChange = (event: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const newNameCandidate = event.target.value.replace(/[/\\?%*:|"<>]/g, '-').trim();
    if (pageNameExists(newNameCandidate)) {
      setErrorMessage(t('ux_editor.pages_error_unique'));
    } else if (!newNameCandidate) {
      setErrorMessage(t('ux_editor.pages_error_empty'));
    } else if (newNameCandidate.length >= 30) {
      setErrorMessage(t('ux_editor.pages_error_length'));
    } else if (!validateLayoutNameAndLayoutSetName(newNameCandidate)) {
      setErrorMessage(t('ux_editor.pages_error_format'));
    } else {
      setErrorMessage('');
      setNewName(newNameCandidate);
    }
  };

  /**
   * If there is no error and the name is changed, the new name is saved.
   */
  const handleOnBlur = () => {
    if (errorMessage === '' && oldName !== newName) {
      saveNewName(newName);
    } else {
      setNewName(oldName);
      setErrorMessage('');
    }
  };

  /**
   * If there is no error and the name is changed, and enter is clicked, the new name is saved.
   * When Escape is clicked, the popover closes.
   */
  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !errorMessage && oldName !== newName) {
      saveNewName(newName);
      onClose();
    } else if (event.key === 'Escape') {
      onClose();
      setNewName(oldName);
      setErrorMessage('');
    }
  };

  return (
    <div ref={ref}>
      <Popover className={classes.popover} trigger={trigger} open={open}>
        <Textfield
          label={t('ux_editor.input_popover_label')}
          size='small'
          onBlur={handleOnBlur}
          onKeyDown={handleKeyPress}
          onChange={handleOnChange}
          value={newName}
          error={errorMessage !== ''}
        />
        <ErrorMessage className={classes.errorMessage} size='small'>
          {errorMessage}
        </ErrorMessage>
        <div className={classes.buttonContainer}>
          <Button
            color='secondary'
            variant='quiet'
            onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
              event.stopPropagation();
              onClose(event);
            }}
            size='small'
          >
            {t('general.cancel')}
          </Button>
        </div>
      </Popover>
    </div>
  );
};
