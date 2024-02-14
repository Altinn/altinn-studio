import React, { useMemo, useState } from 'react';
import {
  StudioToggableTextfield,
  type StudioToggableTextfieldProps,
} from '../StudioToggableTextfield';
import type { JsonSchema } from '../../../../../../packages/shared/src/types/JsonSchema';
import { isPropertyRequired, propertyValidation } from '../StudioSchemaValidation';
import { useTranslation } from 'react-i18next';

export type StudioTextfieldSchemaProps = {
  schema: JsonSchema;
  propertyPath: string;
} & StudioToggableTextfieldProps;

export const StudioTextfieldSchema = <T extends unknown, TT extends unknown>({
  schema,
  inputProps,
  viewProps,
  propertyPath,
  ...rest
}: StudioTextfieldSchemaProps) => {
  const [errorMessage, setErrorMessage] = useState<string | null>();
  const { t } = useTranslation();

  const propertyId = useMemo(
    () => (schema && propertyPath ? `${schema.$id}#/${propertyPath}` : null),
    [schema, propertyPath],
  );

  const validateAgainstSchema = (event: React.ChangeEvent<HTMLInputElement>): string | null => {
    const newValue = event.target.value;

    if (isPropertyRequired && newValue?.length === 0) return t('validation_errors.required');

    if (propertyId) {
      const error = propertyValidation;
      if (error) return t('ux_editor.modal_properties_component_id_not_valid');
    }
    return null;
  };

  const handleOnChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const validationError = validateAgainstSchema(event);
    setErrorMessage(validationError);
    if (!validationError) {
      inputProps.onChange?.(event);
    }
  };

  return (
    <StudioToggableTextfield
      {...rest}
      inputProps={{
        ...inputProps,
        onChange: (e) => handleOnChange(e),
        error: errorMessage,
      }}
      viewProps={viewProps}
    />
  );
};
