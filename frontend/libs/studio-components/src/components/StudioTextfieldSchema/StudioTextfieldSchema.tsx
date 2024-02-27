import React from 'react';
import { JsonSchemaValidator } from './JsonSchemaValidator';
import { type JsonSchema } from '../../types/JSONSchema';
import {
  StudioToggleableTextfield,
  type StudioToggleableTextfieldProps,
} from '../StudioToggableTextfield';

export type SchemaValidationError = {
  errorCode: string;
  details: string;
};

export type StudioTextfieldSchemaProps = {
  schema: JsonSchema;
  propertyPath: string;
  onError?: (error: SchemaValidationError | null) => void;
} & StudioToggleableTextfieldProps;

export const StudioTextfieldSchema = ({
  schema,
  inputProps,
  propertyPath,
  onError,
  ...rest
}: StudioTextfieldSchemaProps): React.ReactElement => {
  const jsonSchemaValidator = new JsonSchemaValidator(schema);
  const propertyId = schema && propertyPath ? `${schema.$id}#/${propertyPath}` : null;

  const validateAgainstSchema = (
    event: React.ChangeEvent<HTMLInputElement>,
  ): SchemaValidationError | null => {
    const newValue = event.target.value;

    if (jsonSchemaValidator.isPropertyRequired(propertyPath) && newValue?.length === 0) {
      return createSchemaError('required', 'Property value is required');
    }

    if (propertyId) {
      const error = jsonSchemaValidator.validateProperty(propertyId, newValue);
      return error ? createSchemaError(error, 'Result of validate property') : null;
    }

    return null;
  };

  const handleOnChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const validationError = validateAgainstSchema(event);

    onError?.(validationError || null);
    inputProps.onChange?.(event);
  };

  return (
    <StudioToggleableTextfield
      {...rest}
      inputProps={{
        ...inputProps,
        onChange: (event: React.ChangeEvent<HTMLInputElement>) => handleOnChange(event),
        error: inputProps.error,
      }}
    />
  );
};

const createSchemaError = (errorCode: string, details: string): SchemaValidationError => ({
  errorCode,
  details,
});
