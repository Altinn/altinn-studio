import React, { useEffect, useState } from 'react';
import { NameError } from '../../types';
import type { TextfieldProps } from '@digdir/design-system-react';
import { AltinnTextField } from 'app-shared/components/AltinnTextField';
import { extractNameFromPointer, replaceLastPointerSegment } from '@altinn/schema-model';
import { isValidName } from '../../utils/ui-schema-utils';
import { useTranslation } from 'react-i18next';
import { FormField } from 'app-shared/components/FormField';
import { useSchemaEditorAppContext } from '@altinn/schema-editor/hooks/useSchemaEditorAppContext';

export type NameFieldProps = TextfieldProps & {
  id?: string;
  pointer: string;
  handleSave: (newNodeName: string, errorCode: string) => void;
  label?: string;
};

export function NameField({ id, pointer, handleSave, label, ...props }: NameFieldProps) {
  const { t } = useTranslation();
  const { schemaModel } = useSchemaEditorAppContext();
  const [nodeName, setNodeName] = useState(extractNameFromPointer(pointer));

  useEffect(() => {
    setNodeName(extractNameFromPointer(pointer));
  }, [pointer]);

  const validateName = (nodeNameToValidate: string): NameError => {
    if (nodeNameToValidate === nodeName) return;
    if (!isValidName(nodeNameToValidate)) return NameError.InvalidCharacter;
    if (schemaModel.hasNode(replaceLastPointerSegment(pointer, nodeNameToValidate)))
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
      renderField={({ errorCode, customRequired, fieldProps }) => (
        <AltinnTextField
          {...fieldProps}
          id={id}
          onChange={(e) => fieldProps.onChange(e.target.value, e)}
          onBlur={(e) => onNameBlur(e.target.value, errorCode)}
          withAsterisk={customRequired}
          {...props}
        />
      )}
    />
  );
}
