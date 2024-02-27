import React from 'react';
import { JsonSchemaValidatorAdapter } from './JsonSchemaValidatorAdapter';
import {
  StudioToggleableTextfield,
  type StudioToggleableTextfieldProps,
} from '../StudioToggableTextfield';

export type SchemaValidationError = {
  errorCode: string;
  details: string;
};
export type StudioTextfieldSchemaProps<Schema> = {
  schema: Schema & { $id: string };
  propertyPath: string;
  jsonValidator: any;
  onError?: (error: SchemaValidationError | null) => void;
} & StudioToggleableTextfieldProps;

export const StudioTextfieldSchema = <Schema,>({
  jsonValidator,
  schema,
  inputProps,
  propertyPath,
  onError,
  ...rest
}: StudioTextfieldSchemaProps<Schema>): React.ReactElement => {
  const studioJSONValidator = new JsonSchemaValidatorAdapter(jsonValidator);
  const propertyId = schema && propertyPath ? `${schema.$id}#/${propertyPath}` : null;

  const validateAgainstSchema = (
    event: React.ChangeEvent<HTMLInputElement>,
  ): SchemaValidationError | null => {
    const newValue = event.target.value;

    if (studioJSONValidator.isPropertyRequired(schema, propertyPath) && newValue?.length === 0) {
      return createSchemaError('required', 'Property value is required');
    }

    if (propertyId) {
      const error = studioJSONValidator.validateProperty(propertyId, newValue);
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
