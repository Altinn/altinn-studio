import React, { useEffect } from 'react';
import type { FC } from 'react';

import { formatLayoutSchemaValidationError } from 'src/features/devtools/utils/layoutSchemaValidation';
import { FormStore } from 'src/features/form/FormContext';
import { getComponentDef, implementsDataModelBindingValidation } from 'src/layout';
import {
  LayoutValidation,
  shouldValidateLayoutConfiguration,
} from 'src/utils/layout/validation/LayoutValidationContext';
import { duplicateStringFilter } from 'src/utils/stringHelper';
import type { CompDef } from 'src/layout';
import type { CompTypes, NodeValidationProps } from 'src/layout/layout';

/**
 * Validates each configured component once. This deliberately uses the static layout components instead of generated
 * nodes, so children of empty repeating groups are included and repeated rows do not duplicate diagnostics.
 */
export function LayoutPropertiesValidation() {
  const components = FormStore.bootstrap.useLayoutLookups().allComponents;

  if (!shouldValidateLayoutConfiguration()) {
    return null;
  }

  return Object.values(components).map((component) =>
    component ? (
      <ComponentPropertiesValidation
        key={component.id}
        externalItem={component}
        intermediateItem={component}
      />
    ) : null,
  );
}

function ComponentPropertiesValidation<T extends CompTypes>(props: NodeValidationProps<T>) {
  const def = getComponentDef(props.externalItem.type);
  const LayoutValidators = def.renderLayoutValidators.bind(def) as unknown as FC<NodeValidationProps<T>>;

  return (
    <>
      <LayoutValidators {...props} />
      {'useDataModelBindingValidation' in def && <DataModelValidation {...props} />}
      <SchemaValidation {...props} />
    </>
  );
}

const emptyArray: never[] = [];
function DataModelValidation<T extends CompTypes>({ externalItem, intermediateItem }: NodeValidationProps<T>) {
  const addError = FormStore.layoutDiagnostics.useAddError();
  const def = getComponentDef(intermediateItem.type);
  const errors =
    implementsDataModelBindingValidation(def, intermediateItem) && window.forceNodePropertiesValidation !== 'off'
      ? // eslint-disable-next-line react-compiler/react-compiler
        def.useDataModelBindingValidation(externalItem.id, intermediateItem.dataModelBindings)
      : emptyArray;

  useEffect(() => {
    if (!errors.length) {
      return;
    }

    window.logErrorOnce(`Data model binding errors for component '/${intermediateItem.id}':\n- ${errors.join('\n- ')}`);

    for (const error of errors) {
      addError(error, intermediateItem.id, 'node');
    }
  }, [addError, errors, intermediateItem]);

  return null;
}

function SchemaValidation<T extends CompTypes>({ intermediateItem, externalItem }: NodeValidationProps<T>) {
  const validate = LayoutValidation.useValidate();
  const addError = FormStore.layoutDiagnostics.useAddError();

  useEffect(() => {
    if (!validate) {
      return;
    }
    const def = getComponentDef(externalItem.type) as CompDef<T>;
    const errors = def.validateLayoutConfig(externalItem as never, validate);
    if (!errors) {
      return;
    }

    const errorMessages = errors
      .map(formatLayoutSchemaValidationError)
      .filter((m) => m != null)
      .filter(duplicateStringFilter) as string[];
    if (!errorMessages.length) {
      return;
    }

    window.logErrorOnce(
      `Layout configuration errors for component '/${intermediateItem.id}':\n- ${errorMessages.join('\n- ')}`,
    );

    for (const error of errorMessages) {
      addError(error, intermediateItem.id, 'node');
    }
  }, [externalItem, validate, addError, intermediateItem.id]);

  return null;
}
