import React, { useEffect, useRef } from 'react';

import { useQuery } from '@tanstack/react-query';
import type { ErrorObject } from 'ajv';
import type Ajv from 'ajv';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { createContext } from 'src/core/contexts/context';
import { useDevToolsStore } from 'src/features/devtools/data/DevToolsStore';
import {
  createLayoutValidator,
  EMPTY_SCHEMA_NAME,
  LAYOUT_SCHEMA_NAME,
} from 'src/features/devtools/utils/layoutSchemaValidation';
import { isDev } from 'src/utils/isDev';
import { NodesInternal } from 'src/utils/layout/NodesContext';

interface Context {
  schemaValidator: ValidateFunc | undefined;
}

const { Provider, useCtx } = createContext<Context>({
  name: 'GenerationValidation',
  required: true,
});

export const GeneratorValidation = {
  useValidate: () => useCtx().schemaValidator,
};

export function GeneratorValidationProvider({ children }) {
  const [schemaValidator, setSchemaValidator] = React.useState<ValidateFunc | undefined>(undefined);

  return (
    <Provider
      value={{
        schemaValidator,
      }}
    >
      <FetchLayoutSchema setSchemaValidator={setSchemaValidator} />
      {children}
    </Provider>
  );
}

function FetchLayoutSchema({
  setSchemaValidator,
}: {
  setSchemaValidator: React.Dispatch<React.SetStateAction<ValidateFunc | undefined>>;
}) {
  const enabled = useIsLayoutValidationEnabled();

  const { fetchLayoutSchema } = useAppQueries();
  const { data: layoutSchema, isSuccess } = useQuery({
    enabled,
    queryKey: ['fetchLayoutSchema'],
    queryFn: () => fetchLayoutSchema(),
  });

  useEffect(() => {
    if (isSuccess && layoutSchema) {
      const ajv = createLayoutValidator(layoutSchema);
      setSchemaValidator(() => makeValidateFunc(ajv));
    }
  }, [isSuccess, layoutSchema, setSchemaValidator]);

  return null;
}

function useIsLayoutValidationEnabled() {
  const hasBeenEnabledBefore = useRef(false);
  const panelOpen = useDevToolsStore((s) => s.isOpen);
  const hasErrors = NodesInternal.useHasErrors();
  const enabled = isDev() || hasErrors || panelOpen || hasBeenEnabledBefore.current;
  hasBeenEnabledBefore.current = enabled;

  if (window.forceNodePropertiesValidation === 'on') {
    return true;
  }

  if (window.forceNodePropertiesValidation === 'off') {
    return false;
  }

  return enabled;
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

type ValidateFunc = ReturnType<typeof makeValidateFunc>;
