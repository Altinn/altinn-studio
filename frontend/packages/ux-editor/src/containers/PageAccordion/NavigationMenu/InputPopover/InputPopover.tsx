import React, { ReactNode, useRef, useEffect, ChangeEvent, useState } from 'react';
import classes from './InputPopover.module.css';
import { Button, ErrorMessage, Paragraph, Popover, Textfield } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import { validateLayoutNameAndLayoutSetName } from '../../../../utils/validationUtils/validateLayoutNameAndLayoutSetName';

export type InputPopoverProps = {
  oldName: string;
  layoutOrder: string[];
  saveNewName: (newName: string) => void;
  onClose: (event?: React.MouseEvent<HTMLButtonElement> | MouseEvent) => void;
  open: boolean;
  trigger: ReactNode;
};

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

  const pageNameExists = (candidateName: string): boolean =>
    layoutOrder.some((p: string) => p.toLowerCase() === candidateName.toLowerCase());

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

  const handleOnBlur = () => {
    if (errorMessage === '' && oldName !== newName) {
      saveNewName(newName);
    } else {
      setNewName(oldName);
      setErrorMessage('');
    }
  };

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
