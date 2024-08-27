import { useMemo } from 'react';

import { useAttachmentsSelector } from 'src/features/attachments/hooks';
import { FD } from 'src/features/formData/FormDataWrite';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { Validation } from 'src/features/validation/validationContext';
import { implementsValidateComponent, implementsValidateEmptyField } from 'src/layout';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import type { AnyValidation, BaseValidation, ValidationDataSources } from 'src/features/validation';
import type { CompDef, ValidationFilter } from 'src/layout';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { NodeDataSelector } from 'src/utils/layout/NodesContext';

/**
 * Runs validations defined in the component classes. This runs from the node generator, and will collect all
 * validations for a node and return them.
 */
export function useNodeValidation(node: LayoutNode, shouldValidate: boolean): AnyValidation[] {
  const fieldSelector = Validation.useFieldSelector();
  const validationDataSources = useValidationDataSources();
  const nodeDataSelector = NodesInternal.useNodeDataSelector();

  return useMemo(() => {
    const validations: AnyValidation[] = [];
    if (!shouldValidate) {
      return validations;
    }

    if (implementsValidateEmptyField(node.def)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      validations.push(...node.def.runEmptyFieldValidation(node as any, validationDataSources));
    }

    if (implementsValidateComponent(node.def)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      validations.push(...node.def.runComponentValidation(node as any, validationDataSources));
    }

    const dataModelBindings = validationDataSources.nodeDataSelector(
      (picker) => picker(node)?.layout.dataModelBindings,
      [node],
    );
    for (const [bindingKey, _field] of Object.entries(dataModelBindings || {})) {
      const field = _field as string;
      const fieldValidations = fieldSelector((fields) => fields[field], [field]);
      if (fieldValidations) {
        validations.push(...fieldValidations.map((v) => ({ ...v, node, bindingKey })));
      }
    }

    return filter(validations, node, nodeDataSelector);
  }, [node, fieldSelector, shouldValidate, validationDataSources, nodeDataSelector]);
}

/**
 * Hook providing validation data sources
 */
function useValidationDataSources(): ValidationDataSources {
  const formDataSelector = FD.useDebouncedSelector();
  const invalidDataSelector = FD.useInvalidDebouncedSelector();
  const attachmentsSelector = useAttachmentsSelector();
  const currentLanguage = useCurrentLanguage();
  const nodeSelector = NodesInternal.useNodeDataSelector();

  return useMemo(
    () => ({
      formDataSelector,
      invalidDataSelector,
      attachmentsSelector,
      currentLanguage,
      nodeDataSelector: nodeSelector,
    }),
    [attachmentsSelector, currentLanguage, formDataSelector, invalidDataSelector, nodeSelector],
  );
}

/**
 * Filters a list of validations based on the validation filters of a node
 */
function filter<Validation extends BaseValidation>(
  validations: Validation[],
  node: LayoutNode,
  selector: NodeDataSelector,
): Validation[] {
  if (!implementsValidationFilter(node.def)) {
    return validations;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filters = node.def.getValidationFilters(node as any, selector);
  if (filters.length == 0) {
    return validations;
  }

  const out: Validation[] = [];
  validationsLoop: for (let i = 0; i < validations.length; i++) {
    for (const filter of filters) {
      if (!filter(validations[i], i, validations)) {
        // Skip validation if any filter returns false
        continue validationsLoop;
      }
    }
    out.push(validations[i]);
  }
  return out;
}

function implementsValidationFilter<Def extends CompDef>(def: Def): def is Def & ValidationFilter {
  return 'getValidationFilters' in def;
}
