import React from 'react';
import {
  StudioToggableTextfield,
  type StudioToggableTextfieldProps,
} from '../StudioToggableTextfield';
import type { JsonSchema } from '../../../../../../packages/shared/src/types/JsonSchema';

import { StudioJSONValidatorUtils } from '../StudioJSONValidatorUtils';

export type SchemaValidationError = {
  errorCode: string;
  details: string;
};
export type StudioTextfieldSchemaProps = {
  schema: JsonSchema;
  propertyPath: string;
  jsonValidator: any;
  onError?: (error: SchemaValidationError | null) => void;
} & StudioToggableTextfieldProps;

export const StudioTextfieldSchema = ({
  jsonValidator,
  schema,
  inputProps,
  propertyPath,
  onError,
  ...rest
}: StudioTextfieldSchemaProps) => {
  const studioJSONValidator = new StudioJSONValidatorUtils(jsonValidator);

  const propertyId = schema && propertyPath ? `${schema.$id}#/${propertyPath}` : null;

  const validateAgainstSchema = (
    event: React.ChangeEvent<HTMLInputElement>,
  ): SchemaValidationError | null => {
    const newValue = event.target.value;

    if (studioJSONValidator.isPropertyRequired(schema, propertyPath) && newValue?.length === 0) {
      return { errorCode: 'required', details: 'Property value is required' };
    }
    if (propertyId) {
      const error = studioJSONValidator.validateProperty(propertyId, newValue);
      return error ? { errorCode: error, details: 'Result of validate property' } : null;
    }
    return null;
  };

  const handleOnChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const validationError = validateAgainstSchema(event);

    onError?.(validationError || null);

    inputProps.onChange?.(event);
  };

  return (
    <StudioToggableTextfield
      {...rest}
      inputProps={{
        ...inputProps,
        onChange: (e) => handleOnChange(e),
        error: inputProps.error,
        'aria-label': `input-${propertyPath}`,
      }}
    />
  );
};
