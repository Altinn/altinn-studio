import { StudioDeleteButton } from '@studio/components';
import type { HeadingRowProps } from './HeadingRow';
import { useTranslation } from 'react-i18next';
import { useSavableSchemaModel } from '../../../hooks/useSavableSchemaModel';
import { useSchemaEditorAppContext } from '../../../hooks/useSchemaEditorAppContext';
import React from 'react';

export const DeleteTypeButton = ({ schemaPointer }: HeadingRowProps) => {
  const { t } = useTranslation();
  const savableModel = useSavableSchemaModel();
  const { setSelectedUniquePointer, setSelectedTypePointer } = useSchemaEditorAppContext();

  const isInUse = savableModel.hasReferringNodes(schemaPointer);

  const handleDeleteType = () => {
    setSelectedUniquePointer(null);
    setSelectedTypePointer(null);
    savableModel.deleteNode(schemaPointer);
  };

  return (
    <StudioDeleteButton
      disabled={isInUse}
      onDelete={handleDeleteType}
      confirmMessage={t('schema_editor.confirm_type_deletion')}
      size='small'
      title={isInUse ? t('schema_editor.cannot_delete_definition_in_use') : t('general.delete')}
    >
      {t('general.delete')}
    </StudioDeleteButton>
  );
};
