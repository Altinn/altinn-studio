import { useQuery } from '@tanstack/react-query';
import type Ajv from 'ajv';
import type { ErrorObject } from 'ajv';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import {
  createLayoutValidator,
  EMPTY_SCHEMA_NAME,
  LAYOUT_SCHEMA_NAME,
} from 'src/features/devtools/utils/layoutSchemaValidation';
import { isDev } from 'src/utils/isDev';

export type LayoutValidationResult = Record<string, string[]>;
export type ValidateFunc = ReturnType<typeof makeValidateFunc>;

export function useLayoutSchemaValidator(enabled = shouldValidateLayoutConfiguration()) {
  const { fetchLayoutSchema } = useAppQueries();
  return useQuery({
    enabled,
    queryKey: ['fetchLayoutSchema'],
    queryFn: async () => {
      const schema = await fetchLayoutSchema();
      if (!schema) {
        return null;
      }
      return makeValidateFunc(createLayoutValidator(schema));
    },
  });
}

export function shouldValidateLayoutConfiguration() {
  if (window.forceLayoutPropertiesValidation === 'on') {
    return true;
  }

  if (window.forceLayoutPropertiesValidation === 'off') {
    return false;
  }

  return isDev();
}

/**
 * Validation function passed to component classes.
 * Component class decides which schema pointer to use and what data to validate.
 * If pointer is null, it will validate against an empty schema with additionalProperties=false,
 * to indicate that everything is invalid. Useful for grid cells where the type cannot be decided.
 * Component classes can choose to modify the output errors before returning.
 */
function makeValidateFunc(validator: Ajv) {
  function validate(pointer: string | null, data: unknown): ErrorObject[] | undefined {
    const isValid = pointer?.length
      ? validator.validate(`${LAYOUT_SCHEMA_NAME}${pointer}`, data)
      : validator.validate(EMPTY_SCHEMA_NAME, data);

    if (!isValid && validator.errors) {
      return validator.errors;
    }
    return undefined;
  }

  return validate;
}
