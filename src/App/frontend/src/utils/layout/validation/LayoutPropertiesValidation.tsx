import React, { useEffect, useState } from 'react';
import type { PropsWithChildren } from 'react';

import { Loader } from 'src/core/loading/Loader';
import { formatLayoutSchemaValidationError } from 'src/features/devtools/utils/layoutSchemaValidation';
import { FormStore } from 'src/features/form/FormContext';
import { useShallowMemo } from 'src/hooks/useShallowMemo';
import { getComponentDef, implementsDataModelBindingValidation } from 'src/layout';
import {
  shouldValidateLayoutConfiguration,
  useLayoutSchemaValidator,
} from 'src/utils/layout/validation/LayoutValidationContext';
import { duplicateStringFilter } from 'src/utils/stringHelper';
import type { FormStoreState } from 'src/features/form/FormContext';
import type { FormBootstrapContextValue } from 'src/features/formBootstrap/types';
import type { IDataModelReference } from 'src/layout/common.generated';
import type { CompExternal, CompTypes } from 'src/layout/layout';
import type { AnyComponent } from 'src/layout/LayoutComponent';
import type { LayoutValidationResult, ValidateFunc } from 'src/utils/layout/validation/LayoutValidationContext';

type LayoutPropertiesValidationContext = {
  bootstrap: FormBootstrapContextValue;
  schemaValidator: ValidateFunc | null | undefined;
};

type DataModelBindingsValidator = (
  baseComponentId: string,
  bindings: CompExternal['dataModelBindings'],
  context: ReturnType<typeof makeDataModelBindingValidationContext>,
) => string[];

export function LayoutPropertiesValidation({ children }: PropsWithChildren) {
  const enabled = shouldValidateLayoutConfiguration();
  const { data: schemaValidator, isPending: schemaValidatorIsPending } = useLayoutSchemaValidator(enabled);
  const replaceErrors = FormStore.raw.useStaticSelector((state) => state.layoutDiagnostics.replaceErrors);
  const bootstrap = FormStore.raw.useMemoSelector((state) => state.bootstrap);
  const validationRun = useShallowMemo<LayoutPropertiesValidationContext>({
    bootstrap,
    schemaValidator,
  });
  const [completedValidationRun, setCompletedValidationRun] = useState<typeof validationRun | undefined>();

  useEffect(() => {
    if (schemaValidatorIsPending) {
      return;
    }

    replaceErrors(
      validateLayoutProperties({
        bootstrap: validationRun.bootstrap,
        schemaValidator: validationRun.schemaValidator,
      }),
    );
    setCompletedValidationRun(validationRun);
  }, [replaceErrors, schemaValidatorIsPending, validationRun]);

  if (!enabled) {
    return children;
  }

  if (schemaValidatorIsPending) {
    return <Loader reason='layout-validation-schema' />;
  }

  return (
    <>
      <ComponentLayoutValidators bootstrap={bootstrap} />
      {completedValidationRun === validationRun ? children : <Loader reason='layout-validation' />}
    </>
  );
}

function ComponentLayoutValidators({ bootstrap }: { bootstrap: FormBootstrapContextValue }) {
  return (
    <>
      {Object.values(bootstrap.layoutLookups.allComponents)
        .filter((component): component is CompExternal => component !== undefined)
        .map((component) => {
          const def = getComponentDef(component.type) as unknown as AnyComponent<CompTypes>;
          const Component = def.renderLayoutValidators;
          return (
            <Component
              key={component.id}
              externalItem={component}
            />
          );
        })}
    </>
  );
}

export function validateLayoutProperties({
  bootstrap,
  schemaValidator,
}: LayoutPropertiesValidationContext): LayoutValidationResult {
  const errors: LayoutValidationResult = {};
  const context = makeDataModelBindingValidationContext(bootstrap);

  for (const component of Object.values(bootstrap.layoutLookups.allComponents)) {
    if (!component) {
      continue;
    }

    const def = getComponentDef(component.type);
    if (implementsDataModelBindingValidation(def, component) && window.forceLayoutPropertiesValidation !== 'off') {
      const validateDataModelBindings = def.validateDataModelBindings as DataModelBindingsValidator;
      for (const error of validateDataModelBindings(component.id, component.dataModelBindings, context)) {
        addNodeError(errors, component.id, error, `Data model binding errors for component '/${component.id}'`);
      }
    }

    if (schemaValidator) {
      const schemaErrors = def.validateLayoutConfig(component as never, schemaValidator);
      if (schemaErrors) {
        for (const error of schemaErrors
          .map(formatLayoutSchemaValidationError)
          .filter((message) => message != null)
          .filter(duplicateStringFilter) as string[]) {
          addNodeError(errors, component.id, error, `Layout configuration errors for component '/${component.id}'`);
        }
      }
    }
  }

  return errors;
}

function makeDataModelBindingValidationContext(bootstrap: FormBootstrapContextValue) {
  return {
    lookupBinding: makeLookupBinding(bootstrap.dataModels),
    layoutLookups: bootstrap.layoutLookups,
  };
}

function makeLookupBinding(dataModels: FormStoreState['bootstrap']['dataModels']) {
  if (Object.keys(dataModels).every((dataType) => dataModels[dataType])) {
    return (reference: IDataModelReference) =>
      dataModels[reference.dataType].schemaResult.lookupTool.getSchemaForPath(reference.field);
  }

  return undefined;
}

function addNodeError(errors: LayoutValidationResult, componentId: string, error: string, logPrefix: string) {
  const key = `node/${componentId}`;
  errors[key] ??= [];
  if (!errors[key].includes(error)) {
    errors[key].push(error);
  }
  window.logErrorOnce(`${logPrefix}:\n- ${error}`);
}
