import React from 'react';
import { Fieldset, Switch } from '@digdir/designsystemet-react';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import {
  CustomPropertyType,
  deleteProperty,
  propertyType,
  setCustomProperties,
  setProperty,
} from '@altinn/schema-model';
import { TrashIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import classes from './CustomProperties.module.css';
import { useSchemaEditorAppContext } from '@altinn/schema-editor/hooks/useSchemaEditorAppContext';
import { StudioButton, StudioTextfield } from '@studio/components-legacy';
import { StudioHelpText } from '@studio/components';

export interface CustomPropertiesProps {
  path: string;
}

const inputId = (key: string) => `custom-property-${key}`;

export const CustomProperties = ({ path }: CustomPropertiesProps) => {
  const { schemaModel, save, selectedUniquePointer } = useSchemaEditorAppContext();
  const { t } = useTranslation();

  const selectedItem = schemaModel.getNodeByUniquePointer(selectedUniquePointer);
  const { custom } = selectedItem;

  function changeProperties(properties: KeyValuePairs) {
    save(setCustomProperties(schemaModel, { path, properties }));
  }

  function handlePropertyChange<T>(key: string, value: T) {
    changeProperties(setProperty(custom, key, value));
  }

  function deleteCustomProperty(key: string) {
    changeProperties(deleteProperty(custom, key));
  }

  function renderInput(key: string) {
    const id = inputId(key);
    switch (propertyType(custom, key)) {
      case CustomPropertyType.String:
        return (
          <StringInput
            id={id}
            value={custom[key]}
            onChange={(value) => handlePropertyChange<string>(key, value)}
          />
        );
      case CustomPropertyType.Number:
        return (
          <NumberInput
            id={id}
            value={custom[key]}
            onChange={(value) => handlePropertyChange<number>(key, value)}
          />
        );
      case CustomPropertyType.Boolean:
        return (
          <BooleanInput
            id={id}
            value={custom[key]}
            onChange={(value) => handlePropertyChange<boolean>(key, value)}
          />
        );
      default:
        return <UnsupportedInput />;
    }
  }

  function renderKey(key: string) {
    return propertyType(custom, key) === CustomPropertyType.Unsupported ? (
      key
    ) : (
      <label htmlFor={inputId(key)}>{key}</label>
    );
  }

  return (
    <Fieldset
      className={classes.root}
      description={t('schema_editor.custom_props_help')}
      legend={t('schema_editor.custom_props')}
    >
      {Object.keys(custom).map((key) => (
        <div key={key} className={classes.listItem}>
          <span className={classes.data}>
            <span>{renderKey(key)}</span>
            <span>{renderInput(key)}</span>
          </span>
          <StudioButton
            icon={<TrashIcon />}
            onClick={() => deleteCustomProperty(key)}
            title={t('general.delete')}
          />
        </div>
      ))}
    </Fieldset>
  );
};

export interface InputProps<T> {
  id: string;
  value: T;
  onChange: (value: T) => void;
}

export const StringInput = ({ id, value, onChange }: InputProps<string>) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value);
  return <StudioTextfield id={id} value={value} onChange={handleChange} />;
};

export const NumberInput = ({ id, value, onChange }: InputProps<number>) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => onChange(Number(e.target.value));
  return <StudioTextfield id={id} type='number' value={value.toString()} onChange={handleChange} />;
};

export const BooleanInput = ({ id, value, onChange }: InputProps<boolean>) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.checked);
  return <Switch size='small' id={id} onChange={handleChange} checked={value} />;
};

export const UnsupportedInput = () => {
  const { t } = useTranslation();
  return (
    <span className={classes.unknownFormatValue}>
      {t('schema_editor.custom_props_unknown_format')}
      <StudioHelpText aria-label={t('general.help')}>
        {t('schema_editor.custom_props_unknown_format_help')}
      </StudioHelpText>
    </span>
  );
};
