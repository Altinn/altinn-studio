import React from 'react';

import { FormStore } from 'src/features/form/FormContext';
import { RunOptionsEffectsForNode } from 'src/features/options/RunOptionsEffectsForNode';
import { getComponentBehaviors, getComponentDef } from 'src/layout';
import { DataModelLocationProviderFromRowContexts } from 'src/utils/layout/DataModelLocation';
import { deriveRuntimeNodeRefs } from 'src/utils/layout/deriveRuntimeNodeRefs';

export function RunOptionsEffects() {
  const nodes = FormStore.raw.useMemoSelector((state) =>
    deriveRuntimeNodeRefs(state).flatMap((node) => {
      const component = state.bootstrap.layoutLookups.getComponent(node.baseId);
      if (!getComponentBehaviors(component.type)?.canHaveOptions) {
        return [];
      }

      const valueType = getComponentDef(component.type).getOptionsEffectValueType();
      if (!valueType) {
        return [];
      }

      return [{ node, valueType }];
    }),
  );

  return (
    <>
      {nodes.map(({ node, valueType }) => (
        <DataModelLocationProviderFromRowContexts
          key={node.id}
          rowContexts={node.rowContexts}
        >
          <RunOptionsEffectsForNode
            node={node}
            valueType={valueType}
          />
        </DataModelLocationProviderFromRowContexts>
      ))}
    </>
  );
}
