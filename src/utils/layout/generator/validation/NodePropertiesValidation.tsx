import React, { useEffect } from 'react';
import type { FC } from 'react';

import { formatLayoutSchemaValidationError } from 'src/features/devtools/utils/layoutSchemaValidation';
import { getNodeDef, implementsDataModelBindingValidation } from 'src/layout';
import { GeneratorValidation } from 'src/utils/layout/generator/validation/GenerationValidationContext';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import { duplicateStringFilter } from 'src/utils/stringHelper';
import type { CompTypes, NodeValidationProps } from 'src/layout/layout';

/**
 * Validates the properties of a node. Note that this is not the same as validating form data in the node.
 */
export function NodePropertiesValidation<T extends CompTypes>(props: NodeValidationProps<T>) {
  const def = getNodeDef(props.node);
  const LayoutValidators = def.renderLayoutValidators.bind(def) as FC<NodeValidationProps<T>>;

  return (
    <>
      <LayoutValidators {...props} />
      {'useDataModelBindingValidation' in def && <DataModelValidation {...props} />}
      <SchemaValidation {...props} />
    </>
  );
}

const emptyArray: never[] = [];
function DataModelValidation<T extends CompTypes>({ node, intermediateItem }: NodeValidationProps<T>) {
  const addError = NodesInternal.useAddError();
  const def = node.def;
  const errors =
    implementsDataModelBindingValidation(def, node) && window.forceNodePropertiesValidation !== 'off'
      ? def.useDataModelBindingValidation(node, intermediateItem.dataModelBindings)
      : emptyArray;

  // Must run after nodes have been added for the errors to actually be added
  useEffect(() => {
    if (!errors.length) {
      return;
    }

    window.logErrorOnce(`Data model binding errors for component '/${node.id}':\n- ${errors.join('\n- ')}`);

    for (const error of errors) {
      addError(error, node);
    }
  }, [addError, errors, node]);

  return null;
}

function SchemaValidation<T extends CompTypes>({ node, externalItem }: NodeValidationProps<T>) {
  const validate = GeneratorValidation.useValidate();
  const addError = NodesInternal.useAddError();

  useEffect(() => {
    if (!validate) {
      return;
    }
    const def = getNodeDef(node);
    const errors = def.validateLayoutConfig(externalItem, validate);
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

    window.logErrorOnce(`Layout configuration errors for component '/${node.id}':\n- ${errorMessages.join('\n- ')}`);

    for (const error of errorMessages) {
      addError(error, node);
    }
  }, [node, externalItem, validate, addError]);

  return null;
}
