import React, { useEffect, useState } from 'react';
import { NameError } from '../../types';
import { TextField } from '@digdir/design-system-react';
import { setPropertyName } from '@altinn/schema-model';
import {
  getNameFromPointer,
  hasNodePointer,
  replaceLastPointerSegment,
} from '@altinn/schema-model';
import { isValidName } from '../../utils/ui-schema-utils';
import { useTranslation } from 'react-i18next';
import { useDatamodelQuery } from '@altinn/schema-editor/hooks/queries';
import { useDatamodelMutation } from '@altinn/schema-editor/hooks/mutations';
import { FormField } from 'app-shared/components/FormField';

export type FormFieldNameProps = {
  pointer: string;
  label?: string;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  hideLabel?: boolean;
  disabled?: boolean;
  callback?: (pointer: string) => void;
};

export function FormFieldName({
  label,
  pointer,
  onKeyDown,
  hideLabel,
  disabled,
  callback,
}: FormFieldNameProps) {
  const { data } = useDatamodelQuery();
  const { mutate } = useDatamodelMutation();

  const [nodeName, setNodeName] = useState(getNameFromPointer({ pointer }));
  const [tmpNodeName, setTmpNodeName] = useState(nodeName);

  useEffect(() => {
    setNodeName(getNameFromPointer({ pointer }));
  }, [pointer]);

  const validateName = (nodeNameToValidate: string) => {
    if (nodeNameToValidate === nodeName) return;
    if (!isValidName(nodeNameToValidate)) return NameError.InvalidCharacter;
    if (hasNodePointer(data, replaceLastPointerSegment(pointer, nodeNameToValidate))) return NameError.AlreadyInUse;
  };

  const onNameChange = (newNodeName: string) => {
    setTmpNodeName(newNodeName);
  };

  const handleChangeNodeName = (newNodeName: string, errorCode: string) => {
    if (errorCode) return;
    if (newNodeName === nodeName) return;
    mutate(
      setPropertyName(data, {
        path: pointer,
        name: newNodeName,
        callback,
      })
    );
  };

  const { t } = useTranslation();

  return (
    <FormField
      label={!hideLabel && label}
      onChange={onNameChange}
      value={tmpNodeName}
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
    >
      {({ errorCode, onChange }) => <TextField
          aria-label={hideLabel && label}
          onBlur={(e) => handleChangeNodeName(e.target.value, errorCode)}
          onChange={(e) => onChange(e.target.value, e)}
          onKeyDown={onKeyDown}
          disabled={disabled}
        />
      }
    </FormField>
  );
}
