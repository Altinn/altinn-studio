import type { ReactElement } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AddButton } from '../AddButton/AddButton';
import { ApiKeyDialog } from './ApiKeyDialog';

type AddApiKeyProps = {
  onSave: (name: string, expiresAt: string) => void;
  isSaving: boolean;
  newApiKey: string | null;
  onDialogClose: () => void;
  onNameChange?: () => void;
  isDuplicateName?: (name: string) => boolean;
};

export const AddApiKey = ({
  onSave,
  isSaving,
  newApiKey,
  onDialogClose,
  onNameChange,
  isDuplicateName,
}: AddApiKeyProps): ReactElement => {
  const { t } = useTranslation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    onDialogClose();
  };

  return (
    <>
      <AddButton onClick={() => setIsDialogOpen(true)}>{t('settings.api_keys.add')}</AddButton>
      {isDialogOpen && (
        <ApiKeyDialog
          newApiKey={newApiKey}
          onSave={onSave}
          onClose={handleDialogClose}
          isSaving={isSaving}
          onNameChange={onNameChange}
          isDuplicateName={isDuplicateName}
        />
      )}
    </>
  );
};
