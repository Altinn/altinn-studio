import type { ChangeEvent } from 'react';
import { setRequired } from '@altinn/schema-model';
import { useTranslation } from 'react-i18next';
import { useSchemaEditorAppContext } from '../../hooks/useSchemaEditorAppContext';
import { StudioSwitch } from '@studio/components';

export interface RequiredSwitchProps {
  schemaPointer: string;
  isRequired: boolean;
  className?: string;
}

export const RequiredSwitch = ({ schemaPointer, isRequired, className }: RequiredSwitchProps) => {
  const { t } = useTranslation();
  const { schemaModel, save } = useSchemaEditorAppContext();

  const handleRequiredChanged = (event: ChangeEvent<HTMLInputElement>) => {
    const { checked } = event.target;
    if (checked !== isRequired) {
      save(setRequired(schemaModel, { path: schemaPointer, required: checked }));
    }
  };

  return (
    <StudioSwitch
      data-size='sm'
      className={className}
      checked={isRequired}
      onChange={handleRequiredChanged}
      label={t('schema_editor.required')}
    />
  );
};
