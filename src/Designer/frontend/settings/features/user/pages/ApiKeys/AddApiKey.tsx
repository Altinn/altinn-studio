import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioButton } from '@studio/components';
import { PlusIcon } from '@studio/icons';
import { AddApiKeyDialog } from './AddApiKeyDialog/AddApiKeyDialog';
import classes from './AddApiKey.module.css';

type AddApiKeyProps = {
  onApiKeyCreated: (id: number) => void;
};

export const AddApiKey = ({ onApiKeyCreated }: AddApiKeyProps): React.ReactElement => {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);

  const openDialog = () => {
    dialogRef.current?.showModal();
  };

  const closeDialog = () => {
    dialogRef.current?.close();
  };

  return (
    <>
      <div className={classes.addButtonWrapper}>
        <StudioButton
          variant='secondary'
          icon={<PlusIcon />}
          onClick={openDialog}
          className={classes.addButton}
        >
          {t('settings.user.api_keys.add')}
        </StudioButton>
      </div>
      <AddApiKeyDialog
        dialogRef={dialogRef}
        onApiKeyCreated={onApiKeyCreated}
        onClose={closeDialog}
      />
    </>
  );
};
