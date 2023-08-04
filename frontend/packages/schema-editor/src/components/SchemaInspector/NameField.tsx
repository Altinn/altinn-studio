import React, { useEffect, useState } from 'react';
import { NameError } from '../../types';
import type { TextFieldProps } from '@digdir/design-system-react';
import { TextField } from '@digdir/design-system-react';
import {
  getNameFromPointer,
  hasNodePointer,
  replaceLastPointerSegment,
} from '@altinn/schema-model';
import { isValidName } from '../../utils/ui-schema-utils';
import { useTranslation } from 'react-i18next';
import { useDatamodelQuery } from '@altinn/schema-editor/hooks/queries';
import { FormField } from 'app-shared/components/FormField';

export type NameFieldProps = TextFieldProps & {
  id: string;
  pointer: string;
  handleSave: (newNodeName: string, errorCode: string) => void;
  label?: string;
};

export function NameField({
  id,
  pointer,
  handleSave,
  label,
  ...props
}: NameFieldProps) {
  const { data } = useDatamodelQuery();

  const [nodeName, setNodeName] = useState(getNameFromPointer({ pointer }));
  const [tmpNodeName, setTmpNodeName] = useState(nodeName);

  useEffect(() => {
    setNodeName(getNameFromPointer({ pointer }));
  }, [pointer]);

  const validateName = (nodeNameToValidate: string) : NameError => {
    if (nodeNameToValidate === nodeName) return;
    if (!isValidName(nodeNameToValidate)) return NameError.InvalidCharacter;
    if (hasNodePointer(data, replaceLastPointerSegment(pointer, nodeNameToValidate))) return NameError.AlreadyInUse;
  };

  const onNameChange = (newNodeName: string) => {
    setTmpNodeName(newNodeName);
  };
  const onNameBlur = (errorCode: string) => {
    if (errorCode || tmpNodeName === nodeName) return;
    handleSave(tmpNodeName, errorCode)
  }

  const { t } = useTranslation();

  return (
    <FormField
      id={id}
      label={label}
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
          id={id}
          onChange={(e) => onChange(e.target.value, e)}
          onBlur={(e) => onNameBlur(errorCode)}
          {...props}
        />
      }
    </FormField>
  );
}
