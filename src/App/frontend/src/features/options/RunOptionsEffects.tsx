import React from 'react';

import { FormStore } from 'src/features/form/FormContext';
import { RunOptionsEffectsForNode } from 'src/features/options/RunOptionsEffectsForNode';
import { getComponentBehaviors, getComponentDef } from 'src/layout';
import { DataModelLocationProviderFromRowContexts } from 'src/utils/layout/DataModelLocation';
import { deriveLayoutNodes } from 'src/utils/layout/deriveLayoutNodes';

export function RunOptionsEffects() {
  const nodes = FormStore.raw.useMemoSelector((state) =>
    deriveLayoutNodes(state).filter((node) => {
      if (!getComponentBehaviors(node.intermediateItem.type)?.canHaveOptions) {
        return false;
      }

      return !!getComponentDef(node.intermediateItem.type).getOptionsEffectValueType();
    }),
  );

  return (
    <>
      {nodes.map((node) => (
        <DataModelLocationProviderFromRowContexts
          key={node.id}
          rowContexts={node.rowContexts}
        >
          <RunOptionsEffectsForNode
            node={node}
            valueType={getComponentDef(node.intermediateItem.type).getOptionsEffectValueType()!}
          />
        </DataModelLocationProviderFromRowContexts>
      ))}
    </>
  );
}
