import type { JSONSchema7 } from 'json-schema';

import { useDataModelSchema } from 'src/hooks/useDataModelSchema';
import type { IDataModelBindings } from 'src/layout/layout';

type AsSchema<T> = {
  [P in keyof T]: JSONSchema7 | null;
};

// TODO: Take data into account? With proper data, we'll know exactly which schema to use in a oneOf.

export function useBindingSchema<T extends IDataModelBindings | undefined>(bindings: T): AsSchema<T> | undefined {
  const currentSchema = useDataModelSchema();

  const resolvedBindings = bindings && Object.values(bindings).length ? { ...bindings } : undefined;

  if (resolvedBindings && currentSchema) {
    for (const [key, value] of Object.entries(resolvedBindings)) {
      // Converts dot-notation to JsonPointer (including support for repeating groups)
      const schemaPath = `/${value.replace(/\./g, '/')}`.replace(/\[(\d+)]\//g, (...a) => `/${a[1]}/`);

      try {
        const bindingSchema = currentSchema?.getSchema(schemaPath);
        if (bindingSchema?.type === 'error') {
          resolvedBindings[key] = null;
        } else {
          resolvedBindings[key] = bindingSchema;
        }
      } catch {
        resolvedBindings[key] = null;
      }
    }

    return resolvedBindings as AsSchema<T>;
  }

  return undefined;
}
