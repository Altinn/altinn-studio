import { useLayoutLookups } from 'src/features/form/layout/LayoutsContext';
import { Validation } from 'src/features/validation/validationContext';
import {
  type CompDef,
  getComponentDef,
  implementsValidateComponent,
  implementsValidateEmptyField,
  type ValidationFilter,
} from 'src/layout';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { GeneratorInternal } from 'src/utils/layout/generator/GeneratorContext';
import { GeneratorData } from 'src/utils/layout/generator/GeneratorDataSources';
import { useExternalItem } from 'src/utils/layout/hooks';
import type { LayoutLookups } from 'src/features/form/layout/makeLayoutLookups';
import type { AnyValidation, BaseValidation } from 'src/features/validation';
import type { IDataModelReference } from 'src/layout/common.generated';

const emptyArray: AnyValidation[] = [];

/**
 * Runs validations defined in the component classes. This runs from the node generator, and will collect all
 * validations for a node and return them.
 */
export function useNodeValidation(baseComponentId: string): AnyValidation[] {
  const component = useExternalItem(baseComponentId);
  const def = getComponentDef(component.type);
  const indexedId = useIndexedId(baseComponentId);
  const registry = GeneratorInternal.useRegistry();
  const layoutLookups = useLayoutLookups();
  const dataModelBindings = GeneratorInternal.useIntermediateItem()?.dataModelBindings;
  const bindings = Object.entries((dataModelBindings ?? {}) as Record<string, IDataModelReference>);

  // We intentionally break the rules of hooks eslint rule here. All nodes have a type, and that type never changes
  // in the lifetime of the node. Therefore, we can safely ignore the linting rule, as we'll always re-render with
  // the same validator hooks (and thus in practice we will never actually break the rule of hooks, only the linter).
  const unfiltered: AnyValidation[] = [];
  if (implementsValidateEmptyField(def)) {
    unfiltered.push(...def.useEmptyFieldValidation(baseComponentId));
  }

  if (implementsValidateComponent(def)) {
    unfiltered.push(...def.useComponentValidation(baseComponentId));
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
    registry.current.validationsProcessed[indexedId] = state.processedLast;
    return validations;
  });

  unfiltered.push(...fieldValidations);

  const filtered = filter(unfiltered, baseComponentId, def, layoutLookups);
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
  baseComponentId: string,
  def: CompDef,
  layoutLookups: LayoutLookups,
): Validation[] {
  if (!implementsValidationFilter(def)) {
    return validations;
  }

  const filters = def.getValidationFilters(baseComponentId, layoutLookups);
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
