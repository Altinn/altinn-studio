import React, { ReactNode, useRef, useState } from 'react';
import classes from './DeletePopover.module.css';
import { Button, DropdownMenu, Paragraph, Popover } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import { TrashIcon } from '@altinn/icons';

export type DeletePopoverProps = {
  onClose: () => void;
  onDelete: () => void;
};

/**
 * @component
 *    Displays a dropdown menu item with a popover where the user can delete a layout
 *
 * @property {function}[onClose] - Function to be executed on close
 * @property {function}[onDelete] - Function to be executed when clicking delete
 *
 * @returns {ReactNode} - The rendered component
 */
export const DeletePopover = ({ onClose, onDelete }: DeletePopoverProps): ReactNode => {
  const { t } = useTranslation();

  const newNameRef = useRef(null);

  const [popoverOpen, setPopoverOpen] = useState<boolean>(false);

  const handleClose = () => {
    onClose();
    setPopoverOpen((v) => !v);
  };

  return (
    <>
      <DropdownMenu.Item
        onClick={() => setPopoverOpen(true)}
        id='delete-page-button'
        color='danger'
        ref={newNameRef}
        aria-expanded={popoverOpen}
      >
        <TrashIcon />
        {t('ux_editor.page_menu_delete')}
      </DropdownMenu.Item>
      <Popover
        variant='warning'
        anchorEl={newNameRef.current}
        open={popoverOpen}
        onClose={handleClose}
      >
        <Popover.Content>
          <Paragraph size='small'>{t('ux_editor.page_delete_text')}</Paragraph>
          <Paragraph size='small'>{t('ux_editor.page_delete_information')}</Paragraph>
          <div className={classes.buttonWrapper}>
            <Button size='small' color='danger' onClick={onDelete}>
              {t('ux_editor.page_delete_confirm')}
            </Button>
            <Button size='small' variant='tertiary'>
              {t('general.cancel')}
            </Button>
          </div>
        </Popover.Content>
      </Popover>
    </>
  );
};
