import React, { forwardRef } from 'react';
import { JsonSchemaValidator } from './JsonSchemaValidator';
import { type JsonSchema } from '../../types/JSONSchema';
import type { Override } from '../../types/Override';
import {
  StudioToggleableTextfield,
  type StudioToggleableTextfieldProps,
} from '../StudioToggleableTextfield';

export type SchemaValidationError = {
  errorCode: string;
  details: string;
};

export type StudioToggleableTextfieldSchemaProps = Override<
  {
    layoutSchema: JsonSchema;
    relatedSchemas: JsonSchema[];
    propertyPath: string;
    onIsViewMode?: (isViewMode: boolean) => void;
    onError?: (error: SchemaValidationError | null) => void;
  },
  StudioToggleableTextfieldProps
>;

export const StudioToggleableTextfieldSchema = forwardRef<
  HTMLInputElement,
  StudioToggleableTextfieldSchemaProps
>(
  (
    {
      error,
      layoutSchema,
      onChange,
      onError,
      onIsViewMode,
      propertyPath,
      relatedSchemas,
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
        const schemaError = jsonSchemaValidator.validateProperty(propertyId, newValue);
        return schemaError ? createSchemaError(schemaError, 'Result of validate property') : null;
      }

      return null;
    };

    const handleOnChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
      const validationError = validateAgainstSchema(event);
      onError?.(validationError || null);
      onChange?.(
        event as React.ChangeEvent<HTMLInputElement> & React.ChangeEvent<HTMLTextAreaElement>,
      );
    };

    return (
      <StudioToggleableTextfield
        error={error}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => handleOnChange(event)}
        onIsViewMode={onIsViewMode}
        ref={ref}
        {...rest}
      />
    );
  },
);

StudioToggleableTextfieldSchema.displayName = 'StudioToggleableTextfieldSchema';

const createSchemaError = (errorCode: string, details: string): SchemaValidationError => ({
  errorCode,
  details,
});
