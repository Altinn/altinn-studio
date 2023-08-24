import React, { useEffect } from 'react';
import { IGenericEditComponent } from '../componentConfig';
import { EditTextResourceBinding } from './EditTextResourceBinding';
import classes from './EditTextResourceBindings.module.css';
import { TranslationKey } from 'language/type';
import { useTranslation } from 'react-i18next';
import { Select } from '@digdir/design-system-react';

export type TextResourceBindingKey = 'description' | 'title' | 'help' | 'body';

export interface EditTextResourceBindingsProps extends IGenericEditComponent {
  textResourceBindingKeys: string[];
}

export const EditTextResourceBindings = ({
  component,
  handleComponentChange,
  textResourceBindingKeys,
}: EditTextResourceBindingsProps) => {
  const { t } = useTranslation();

  const [keysSet, setKeysSet] = React.useState(
    Object.keys(component.textResourceBindings || {}),
  );

  const [keysToAdd, setKeysToAdd] = React.useState<string[]>(textResourceBindingKeys.filter((key) => !keysSet.includes(key)));

  useEffect(() => {
    setKeysToAdd(textResourceBindingKeys.filter((key) => !keysSet.includes(key)));
  }, [keysSet, setKeysToAdd, textResourceBindingKeys]);

  const handleAddKey = (key: string) => {
    setKeysSet([...keysSet, key]);
    handleComponentChange({
      ...component,
      textResourceBindings: {
        ...component.textResourceBindings,
        [key]: '',
      },
    });
  };

  const handleRemoveKey = (key: string) => {
    setKeysSet(keysSet.filter((k) => k !== key));
  }

  return (
    <div className={classes.container}>
      {keysSet.map((key: string) => (
        <EditTextResourceBinding
          key={key}
          component={component}
          handleComponentChange={handleComponentChange}
          removeTextResourceBinding={() => handleRemoveKey(key)}
          textKey={key}
          labelKey={`ux_editor.modal_properties_textResourceBindings_${key}` as TranslationKey}
          placeholderKey={`ux_editor.modal_properties_textResourceBindings_${key}_add` as TranslationKey}
        />
      ))}
      {keysToAdd.length > 0 && <div className={classes.addContainer}>
        <Select
          options={keysToAdd.map((key) => ({
            label: t(`ux_editor.modal_properties_textResourceBindings_${key}`),
            value: key,
          }))}
          onChange={(value) => handleAddKey(value)}
          label={t('ux_editor.text_resource_bindings.add_label')}
        />
      </div>}
    </div>
  );
};
