import type { PrefillConfig } from 'app-shared/types/PrefillConfig';
import { PrefillSource } from 'app-shared/types/PrefillConfig';
import type { PrefillMapping } from '../../types/PrefillMapping';
import type { UiSchemaNodes } from '../../types/UiSchemaNodes';
import { isField } from '../utils';
import { schemaPointerToDataBindingName } from '../pointerUtils';

const buildPrefillMappingByDataBindingName = (
  prefillConfig: PrefillConfig,
): Map<string, PrefillMapping> => {
  const mappingByDataBindingName = new Map<string, PrefillMapping>();
  for (const source of Object.values(PrefillSource)) {
    const sourceConfig = prefillConfig[source];
    if (!sourceConfig) {
      continue;
    }
    for (const [key, dataBindingName] of Object.entries(sourceConfig)) {
      mappingByDataBindingName.set(dataBindingName, { source, key });
    }
  }
  return mappingByDataBindingName;
};

/**
 * Returns a new set of nodes where each field node has its `prefill` attribute set to the mapping
 * (if any) that the given prefill config defines for that field, and cleared if the config no
 * longer defines one. This lets the rest of the application read a field's prefill mapping
 * directly off the node instead of searching the prefill config every time a field is selected.
 */
export const mergePrefillConfig = (
  nodes: UiSchemaNodes,
  prefillConfig: PrefillConfig,
): UiSchemaNodes => {
  const mappingByDataBindingName = buildPrefillMappingByDataBindingName(prefillConfig);
  return nodes.map((node) => {
    if (!isField(node)) {
      return node;
    }
    const mapping = mappingByDataBindingName.get(
      schemaPointerToDataBindingName(node.schemaPointer),
    );
    if (mapping) {
      return { ...node, prefill: mapping };
    }
    if (node.prefill) {
      const { prefill, ...rest } = node;
      return rest;
    }
    return node;
  });
};
