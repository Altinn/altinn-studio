import React, { useEffect } from 'react';
import type { FC } from 'react';

import { formatLayoutSchemaValidationError } from 'src/features/devtools/utils/layoutSchemaValidation';
import { getComponentDef, implementsDataModelBindingValidation } from 'src/layout';
import { GeneratorValidation } from 'src/utils/layout/generator/validation/GenerationValidationContext';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import { duplicateStringFilter } from 'src/utils/stringHelper';
import type { CompDef } from 'src/layout';
import type { CompTypes, NodeValidationProps } from 'src/layout/layout';

/**
 * Validates the properties of a node. Note that this is not the same as validating form data in the node.
 */
export function NodePropertiesValidation<T extends CompTypes>(props: NodeValidationProps<T>) {
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
  const addError = NodesInternal.useAddError();
  const def = getComponentDef(intermediateItem.type);
  const errors =
    implementsDataModelBindingValidation(def, intermediateItem) && window.forceNodePropertiesValidation !== 'off'
      ? // eslint-disable-next-line react-compiler/react-compiler
        def.useDataModelBindingValidation(externalItem.id, intermediateItem.dataModelBindings)
      : emptyArray;

  // Must run after nodes have been added for the errors to actually be added
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
  const validate = GeneratorValidation.useValidate();
  const addError = NodesInternal.useAddError();

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
