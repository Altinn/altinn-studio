import React, { useEffect, useState } from 'react';
import { NameError } from '../../types';
import type { TextfieldProps } from '@digdir/design-system-react';
import { AltinnTextField } from 'app-shared/components/AltinnTextField';
import {
  getNameFromPointer,
  hasNodePointer,
  replaceLastPointerSegment,
} from '@altinn/schema-model';
import { isValidName } from '../../utils/ui-schema-utils';
import { useTranslation } from 'react-i18next';
import { FormField } from 'app-shared/components/FormField';
import { useSchemaEditorAppContext } from '@altinn/schema-editor/hooks/useSchemaEditorAppContext';

export type NameFieldProps = TextfieldProps & {
  id: string;
  pointer: string;
  handleSave: (newNodeName: string, errorCode: string) => void;
  label?: string;
};

export function NameField({ id, pointer, handleSave, label }: NameFieldProps) {
  const { t } = useTranslation();
  const { data } = useSchemaEditorAppContext();
  const [nodeName, setNodeName] = useState(getNameFromPointer({ pointer }));

  useEffect(() => {
    setNodeName(getNameFromPointer({ pointer }));
  }, [pointer]);

  const validateName = (nodeNameToValidate: string): NameError => {
    if (nodeNameToValidate === nodeName) return;
    if (!isValidName(nodeNameToValidate)) return NameError.InvalidCharacter;
    if (hasNodePointer(data, replaceLastPointerSegment(pointer, nodeNameToValidate)))
      return NameError.AlreadyInUse;
  };

  const onNameBlur = (newNodeName: string, errorCode: string) => {
    if (errorCode || newNodeName === nodeName) return;
    handleSave(newNodeName, errorCode);
  };

  return (
    <FormField
      id={id}
      label={label}
      value={nodeName}
      customRequired={true}
      customValidationRules={validateName}
      customValidationMessages={(errorCode: NameError) => {
        switch (errorCode) {
          case NameError.InvalidCharacter:
            return t('schema_editor.nameError_invalidCharacter');
          case NameError.AlreadyInUse:
            return t('schema_editor.nameError_alreadyInUse');
          default:
            return '';
        }
      }}
      renderField={({ errorCode, onChange, customRequired, ...rest }) => (
        <AltinnTextField
          {...rest}
          id={id}
          onChange={(e) => onChange(e.target.value, e)}
          onBlur={(e) => onNameBlur(e.target.value, errorCode)}
          withAsterisk={customRequired}
        />
      )}
    />
  );
}
