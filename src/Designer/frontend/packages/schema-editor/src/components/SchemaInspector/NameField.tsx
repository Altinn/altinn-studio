import React, { useEffect, useState } from 'react';
import { NameError } from '../../types';
import type { StudioTextfieldProps } from 'libs/studio-components-legacy/src';
import { StudioTextfield } from 'libs/studio-components-legacy/src';
import { extractNameFromPointer, replaceLastPointerSegment } from '@altinn/schema-model/index';
import { isValidName } from '../../utils/ui-schema-utils';
import { useTranslation } from 'react-i18next';
import { FormField } from 'app-shared/components/FormField';
import { isCSharpReservedKeyword } from 'app-shared/hooks/useValidateSchemaName';
import { useSchemaEditorAppContext } from '../../hooks/useSchemaEditorAppContext';

export type NameFieldProps = StudioTextfieldProps & {
  id?: string;
  schemaPointer: string;
  handleSave: (newNodeName: string, errorCode: string) => void;
  hideLabel?: boolean;
  label?: string;
};

export function NameField({
  id,
  schemaPointer,
  handleSave,
  label,
  hideLabel,
  ...props
}: NameFieldProps) {
  const { t } = useTranslation();
  const { schemaModel } = useSchemaEditorAppContext();
  const [nodeName, setNodeName] = useState(extractNameFromPointer(schemaPointer));

  useEffect(() => {
    setNodeName(extractNameFromPointer(schemaPointer));
  }, [schemaPointer]);

  const validateName = (nodeNameToValidate: string): NameError => {
    if (nodeNameToValidate === nodeName) return;
    if (!isValidName(nodeNameToValidate)) return NameError.InvalidCharacter;
    if (schemaModel.hasNode(replaceLastPointerSegment(schemaPointer, nodeNameToValidate)))
      return NameError.AlreadyInUse;
    if (isCSharpReservedKeyword(nodeNameToValidate)) return NameError.CSharpReservedKeyword;
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
          case NameError.CSharpReservedKeyword:
            return t('schema_editor.nameError_cSharpReservedKeyword');
          default:
            return '';
        }
      }}
      renderField={({ errorCode, customRequired, fieldProps }) => (
        <StudioTextfield
          {...fieldProps}
          hideLabel={hideLabel}
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
