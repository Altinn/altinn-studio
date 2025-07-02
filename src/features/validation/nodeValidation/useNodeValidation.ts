import { useLayoutLookups } from 'src/features/form/layout/LayoutsContext';
import { Validation } from 'src/features/validation/validationContext';
import {
  type CompDef,
  implementsValidateComponent,
  implementsValidateEmptyField,
  type ValidationFilter,
} from 'src/layout';
import { GeneratorInternal } from 'src/utils/layout/generator/GeneratorContext';
import { GeneratorData } from 'src/utils/layout/generator/GeneratorDataSources';
import type { LayoutLookups } from 'src/features/form/layout/makeLayoutLookups';
import type { AnyValidation, BaseValidation } from 'src/features/validation';
import type { IDataModelReference } from 'src/layout/common.generated';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

const emptyArray: AnyValidation[] = [];

/**
 * Runs validations defined in the component classes. This runs from the node generator, and will collect all
 * validations for a node and return them.
 */
export function useNodeValidation(node: LayoutNode): AnyValidation[] {
  const registry = GeneratorInternal.useRegistry();
  const layoutLookups = useLayoutLookups();
  const dataModelBindings = GeneratorInternal.useIntermediateItem()?.dataModelBindings;
  const bindings = Object.entries((dataModelBindings ?? {}) as Record<string, IDataModelReference>);

  // We intentionally break the rules of hooks eslint rule here. All nodes have a type, and that type never changes
  // in the lifetime of the node. Therefore, we can safely ignore the linting rule, as we'll always re-render with
  // the same validator hooks (and thus in practice we will never actually break the rule of hooks, only the linter).
  const unfiltered: AnyValidation[] = [];
  if (implementsValidateEmptyField(node.def)) {
    unfiltered.push(...node.def.useEmptyFieldValidation(node.baseId));
  }

  if (implementsValidateComponent(node.def)) {
    unfiltered.push(...node.def.useComponentValidation(node.baseId));
  }

  const getDataElementIdForDataType = GeneratorData.useGetDataElementIdForDataType();
  const fieldValidations = Validation.useFullState((state) => {
    const validations: BaseValidation[] = [];
    for (const [bindingKey, { dataType, field }] of bindings) {
      const dataElementId = getDataElementIdForDataType(dataType) ?? dataType; // stateless does not have dataElementId
      const fieldValidations = state.state.dataModels[dataElementId]?.[field];
      if (fieldValidations) {
        validations.push(...fieldValidations.map((v) => ({ ...v, bindingKey })));
      }
    }

    // This is set in the selector because the validation system will wait until all nodes (that validate) have set it.
    // If we set this during render, all components using this hook would have to re-render after saving data, but now
    // they only have to re-run the selector. The downside here is that empty validations and component validations will
    // run outside the selector, so they _may_ have new validations that are not yet processed.
    registry.current.validationsProcessed[node.id] = state.processedLast;
    return validations;
  });

  unfiltered.push(...fieldValidations);

  const filtered = filter(unfiltered, node, layoutLookups);
  if (filtered.length === 0) {
    return emptyArray;
  }

  return filtered;
}

/**
 * Filters a list of validations based on the validation filters of a node
 */
function filter<Validation extends BaseValidation>(
  validations: Validation[],
  node: LayoutNode,
  layoutLookups: LayoutLookups,
): Validation[] {
  if (!implementsValidationFilter(node.def)) {
    return validations;
  }

  const filters = node.def.getValidationFilters(node.baseId, layoutLookups);
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
