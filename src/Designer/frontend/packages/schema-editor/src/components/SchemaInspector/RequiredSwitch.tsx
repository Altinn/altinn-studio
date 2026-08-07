import type { ChangeEvent } from 'react';
import { Switch } from '@digdir/designsystemet-react';
import { setRequired } from '@altinn/schema-model';
import { useTranslation } from 'react-i18next';
import { useSchemaEditorAppContext } from '../../hooks/useSchemaEditorAppContext';

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
    <Switch
      className={className}
      size='small'
      checked={isRequired}
      onChange={handleRequiredChanged}
    >
      {t('schema_editor.required')}
    </Switch>
  );
};
