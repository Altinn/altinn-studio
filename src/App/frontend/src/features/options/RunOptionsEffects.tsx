import React, { useRef } from 'react';

import { FormStore } from 'src/features/form/FormContext';
import { createOptionsEffectNodeSelector } from 'src/features/options/createOptionsEffectNodeSelector';
import { RunOptionsEffectsForNode } from 'src/features/options/RunOptionsEffectsForNode';
import { DataModelLocationProviderFromRowContexts } from 'src/utils/layout/DataModelLocation';

export function RunOptionsEffects() {
  const selector = useRef<ReturnType<typeof createOptionsEffectNodeSelector>>(undefined);
  selector.current ??= createOptionsEffectNodeSelector();
  const nodes = FormStore.raw.useMemoSelector(selector.current);

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
