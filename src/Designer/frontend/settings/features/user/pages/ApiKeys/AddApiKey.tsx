import React, { useState } from 'react';
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
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className={classes.addButtonWrapper}>
        <StudioButton
          variant='secondary'
          icon={<PlusIcon />}
          onClick={() => setIsOpen(true)}
          className={classes.addButton}
        >
          {t('settings.user.api_keys.add')}
        </StudioButton>
      </div>
      {isOpen && (
        <AddApiKeyDialog onApiKeyCreated={onApiKeyCreated} onClose={() => setIsOpen(false)} />
      )}
    </>
  );
};
