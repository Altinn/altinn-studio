import React, { forwardRef } from 'react';
import { JsonSchemaValidator } from './JsonSchemaValidator';
import { type JsonSchema } from '../../types/JSONSchema';
import {
  StudioToggleableTextfield,
  type StudioToggleableTextfieldProps,
} from '../StudioToggleableTextfield';

export type SchemaValidationError = {
  errorCode: string;
  details: string;
};

export type StudioToggleableTextfieldSchemaProps = {
  layoutSchema: JsonSchema;
  relatedSchemas: JsonSchema[];
  propertyPath: string;
  onError?: (error: SchemaValidationError | null) => void;
} & StudioToggleableTextfieldProps;

export const StudioToggleableTextfieldSchema = forwardRef<
  HTMLDivElement,
  StudioToggleableTextfieldSchemaProps
>(
  (
    {
      layoutSchema,
      relatedSchemas,
      inputProps,
      propertyPath,
      onError,
      ...rest
    }: StudioToggleableTextfieldSchemaProps,
    ref,
  ): React.ReactElement => {
    const jsonSchemaValidator = new JsonSchemaValidator(layoutSchema, relatedSchemas);
    const propertyId = layoutSchema && propertyPath ? `${layoutSchema.$id}#/${propertyPath}` : null;

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
        ref={ref}
        inputProps={{
          ...inputProps,
          onChange: (event: React.ChangeEvent<HTMLInputElement>) => handleOnChange(event),
          error: inputProps.error,
        }}
      />
    );
  },
);

StudioToggleableTextfieldSchema.displayName = 'StudioToggleableTextfieldSchema';

const createSchemaError = (errorCode: string, details: string): SchemaValidationError => ({
  errorCode,
  details,
});
