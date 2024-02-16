import React, { useMemo, useState } from 'react';
import {
  StudioToggableTextfield,
  type StudioToggableTextfieldProps,
} from '../StudioToggableTextfield';
import type { JsonSchema } from '../../../../../../packages/shared/src/types/JsonSchema';
import { useTranslation } from 'react-i18next';
import { StudioJSONValidatorUtils } from '../StudioJSONValidatorUtils';

export type StudioTextfieldSchemaProps = {
  schema: JsonSchema;
  propertyPath: string;
  jsonValidator: any;
} & StudioToggableTextfieldProps;

export const StudioTextfieldSchema = ({
  jsonValidator,
  schema,
  inputProps,
  propertyPath,
  ...rest
}: StudioTextfieldSchemaProps) => {
  const [errorMessage, setErrorMessage] = useState<string | null>();
  const studioJSONValidator = new StudioJSONValidatorUtils(jsonValidator);
  const { t } = useTranslation();

  const propertyId = useMemo(
    () => (schema && propertyPath ? `${schema.$id}#/${propertyPath}` : null),
    [schema, propertyPath],
  );

  const validateAgainstSchema = (event: React.ChangeEvent<HTMLInputElement>): string | null => {
    const newValue = event.target.value;
    if (studioJSONValidator.isPropertyRequired(schema, propertyPath) && newValue?.length === 0) {
      return t('validation_errors.required');
    }
    if (propertyId) {
      const error = studioJSONValidator.validateProperty(propertyId, newValue);
      if (error) {
        return t('ux_editor.modal_properties_component_id_not_valid');
      }
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
    />
  );
};
