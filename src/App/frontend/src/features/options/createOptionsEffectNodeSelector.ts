import { getComponentBehaviors, getComponentDef } from 'src/layout';
import { deriveRuntimeNodeRefs } from 'src/utils/layout/deriveRuntimeNodeRefs';
import type { FormStoreState } from 'src/features/form/FormContext';
import type { LayoutLookups } from 'src/features/form/layout/makeLayoutLookups';
import type { OptionsValueType } from 'src/features/options/useGetOptions';
import type { RuntimeNodeRef } from 'src/utils/layout/deriveRuntimeNodeRefs';

type OptionsEffectNode = { node: RuntimeNodeRef; valueType: OptionsValueType };

/** Node discovery reads layout structure and debounced row data, never immediate field values. */
export function createOptionsEffectNodeSelector() {
  let previousLookups: LayoutLookups | undefined;
  let previousModels: unknown[] = [];
  let previousNodes: OptionsEffectNode[] | undefined;

  return (state: FormStoreState): OptionsEffectNode[] => {
    const lookups = state.bootstrap.layoutLookups;
    const models: unknown[] = [];
    for (const [dataType, model] of Object.entries(state.data.models)) {
      models.push(dataType, model.debouncedCurrentData);
    }
    if (
      previousNodes &&
      lookups === previousLookups &&
      models.length === previousModels.length &&
      models.every((value, index) => Object.is(value, previousModels[index]))
    ) {
      return previousNodes;
    }

    const nodes = deriveRuntimeNodeRefs(state).flatMap((node) => {
      const component = lookups.getComponent(node.baseId);
      if (!getComponentBehaviors(component.type)?.canHaveOptions) {
        return [];
      }

      const valueType = getComponentDef(component.type).getOptionsEffectValueType();
      return valueType ? [{ node, valueType }] : [];
    });
    previousLookups = lookups;
    previousModels = models;
    previousNodes = nodes;
    return nodes;
  };
}
