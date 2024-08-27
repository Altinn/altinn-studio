import React, { useEffect, useMemo } from 'react';
import type { FC } from 'react';

import { useCurrentDataModelSchemaLookup } from 'src/features/datamodel/DataModelSchemaProvider';
import { formatLayoutSchemaValidationError } from 'src/features/devtools/utils/layoutSchemaValidation';
import { getNodeDef } from 'src/layout';
import { GeneratorStages } from 'src/utils/layout/generator/GeneratorStages';
import { GeneratorValidation } from 'src/utils/layout/generator/validation/GenerationValidationContext';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import { duplicateStringFilter } from 'src/utils/stringHelper';
import type { LayoutValidationCtx } from 'src/features/devtools/layoutValidation/types';
import type { CompIntermediate, CompTypes, NodeValidationProps } from 'src/layout/layout';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

/**
 * Validates the properties of a node. Note that this is not the same as validating form data in the node.
 */
export function NodePropertiesValidation<T extends CompTypes>(props: NodeValidationProps<T>) {
  const def = getNodeDef(props.node);
  const LayoutValidators = def.renderLayoutValidators.bind(def) as FC<NodeValidationProps<T>>;

  return (
    <>
      <LayoutValidators {...props} />
      <DataModelValidation {...props} />
      <SchemaValidation {...props} />
    </>
  );
}

function DataModelValidation<T extends CompTypes>({ node, intermediateItem }: NodeValidationProps<T>) {
  const addError = NodesInternal.useAddError();
  const schemaLookup = useCurrentDataModelSchemaLookup();
  const nodeDataSelector = NodesInternal.useNodeDataSelector();

  const errors = useMemo(() => {
    if (window.forceNodePropertiesValidation === 'off') {
      return [];
    }

    if ('validateDataModelBindings' in node.def) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ctx: LayoutValidationCtx<any> = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        node: node as LayoutNode<any>,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        item: intermediateItem as CompIntermediate<any>,
        nodeDataSelector,
        lookupBinding: (binding: string) => schemaLookup.getSchemaForPath(binding),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return node.def.validateDataModelBindings(ctx as any);
    }

    return [];
  }, [intermediateItem, node, schemaLookup, nodeDataSelector]);

  // Must run after nodes have been added for the errors to actually be added
  GeneratorStages.MarkHidden.useEffect(() => {
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
