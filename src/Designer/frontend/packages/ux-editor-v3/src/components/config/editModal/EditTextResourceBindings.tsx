import type { ChangeEvent } from 'react';
import React, { useMemo } from 'react';
import type { IGenericEditComponent } from '../componentConfig';
import { EditTextResourceBinding } from './EditTextResourceBinding';
import classes from './EditTextResourceBindings.module.css';
import type { TranslationKey } from 'language/type';
import { useTranslation } from 'react-i18next';
import { StudioSelect } from '@studio/components';

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

  const [keysSet, setKeysSet] = React.useState(Object.keys(component.textResourceBindings || {}));

  const keysToAdd = useMemo(
    () => textResourceBindingKeys.filter((key) => !keysSet.includes(key)),
    [keysSet, textResourceBindingKeys],
  );

  const handleAddKey = (event: ChangeEvent<HTMLSelectElement>) => {
    setKeysSet([...keysSet, event.target.value]);
    handleComponentChange({
      ...component,
      textResourceBindings: {
        ...component.textResourceBindings,
        [event.target.value]: '',
      },
    });
  };

  const handleRemoveKey = (key: string) => {
    setKeysSet((prevKeysSet) => prevKeysSet.filter((k) => k !== key));
  };

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
          placeholderKey={
            `ux_editor.modal_properties_textResourceBindings_${key}_add` as TranslationKey
          }
        />
      ))}
      {keysToAdd.length > 0 && (
        <div className={classes.addContainer}>
          <StudioSelect
            id={component.id}
            onChange={handleAddKey}
            label={t('ux_editor.text_resource_bindings.add_label')}
          >
            <option value='' hidden></option>
            {keysToAdd.map((key) => (
              <option key={key} value={key}>
                {t(`ux_editor.modal_properties_textResourceBindings_${key}`)}
              </option>
            ))}
          </StudioSelect>
        </div>
      )}
    </div>
  );
};
