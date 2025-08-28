import React from 'react';
import { StudioActionCard } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { CreateSubformMode } from './CreateSubformMode';

export type AddSubformCardProps = {
  isSubformInEditMode: boolean;
  setIsCreateSubformMode: (isSubformInEditMode: boolean) => void;
};

export const AddSubformCard = ({
  setIsCreateSubformMode,
  isSubformInEditMode,
}: AddSubformCardProps): React.ReactNode => {
  const { t } = useTranslation();

  const handleCreateSubformMode = () => {
    setIsCreateSubformMode(true);
  };

  if (isSubformInEditMode) {
    return <CreateSubformMode setIsCreateSubformMode={setIsCreateSubformMode} />;
  }

  return (
    <StudioActionCard
      onAction={handleCreateSubformMode}
      label={t('ux_editor.task_card_add_new_subform')}
    />
  );
};
