import React, { useEffect, useMemo } from 'react';

import { useCurrentDataModelSchemaLookup } from 'src/features/datamodel/DataModelSchemaProvider';
import { formatLayoutSchemaValidationError } from 'src/features/devtools/utils/layoutSchemaValidation';
import { GeneratorInternal } from 'src/utils/layout/generator/GeneratorContext';
import { GeneratorStages } from 'src/utils/layout/generator/GeneratorStages';
import { GeneratorValidation } from 'src/utils/layout/generator/validation/GenerationValidationContext';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import { duplicateStringFilter } from 'src/utils/stringHelper';
import type { LayoutValidationCtx } from 'src/features/devtools/layoutValidation/types';
import type { CompExternalExact, CompIntermediate } from 'src/layout/layout';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export interface NodeValidationProps {
  node: LayoutNode;
  intermediateItem: CompIntermediate;
}

/**
 * Validates the properties of a node. Note that this is not the same as validating form data in the node.
 */
export function NodePropertiesValidation(props: NodeValidationProps) {
  return (
    <>
      <DataModelValidation {...props} />
      <SchemaValidation {...props} />
    </>
  );
}

function DataModelValidation({ node, intermediateItem }: NodeValidationProps) {
  const addError = NodesInternal.useAddError();
  const schemaLookup = useCurrentDataModelSchemaLookup();
  const nodeDataSelector = NodesInternal.useNodeDataSelector();

  const errors = useMemo(() => {
    if (window.forceNodePropertiesValidation === 'off') {
      return [];
    }

    if ('validateDataModelBindings' in node.def) {
      const ctx: LayoutValidationCtx<any> = {
        node: node as LayoutNode<any>,
        item: intermediateItem as CompIntermediate<any>,
        nodeDataSelector,
        lookupBinding: (binding: string) => schemaLookup.getSchemaForPath(binding),
      };
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

function SchemaValidation({ node }: NodeValidationProps) {
  const validate = GeneratorValidation.useValidate();
  const item = GeneratorInternal.useExternalItem();
  const addError = NodesInternal.useAddError();

  useEffect(() => {
    if (!validate) {
      return;
    }
    const errors = node.def.validateLayoutConfig(item as CompExternalExact<any>, validate);
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
  }, [node, item, validate, addError]);

  return null;
}
