import { useRef } from 'react';

import { FormStore } from 'src/features/form/FormContext';
import { createOptionsEffectNodeSelector } from 'src/features/options/createOptionsEffectNodeSelector';
import { RunOptionsEffectsForNode } from 'src/features/options/RunOptionsEffectsForNode';
import { DataModelLocationProviderFromRowContexts } from 'src/utils/layout/DataModelLocation';
import type { OptionsEffectNode } from 'src/features/options/createOptionsEffectNodeSelector';

function OptionsEffectsForNode({ node, valueType }: OptionsEffectNode) {
  return (
    <DataModelLocationProviderFromRowContexts rowContexts={node.rowContexts}>
      <RunOptionsEffectsForNode
        node={node}
        valueType={valueType}
      />
    </DataModelLocationProviderFromRowContexts>
  );
}

export function RunOptionsEffects() {
  const selector = useRef<ReturnType<typeof createOptionsEffectNodeSelector>>(undefined);
  selector.current ??= createOptionsEffectNodeSelector();
  const nodes = FormStore.raw.useMemoSelector(selector.current);
  const isReadOnly = FormStore.useIsReadOnly();

  if (isReadOnly) {
    // The effects only update form data, which a read-only form (such as a PDF) never writes. Skipping them avoids
    // fetching, filtering and sorting options for every row of every repeating group.
    return null;
  }

  return (
    <>
      {nodes.map(({ node, valueType }) => (
        <OptionsEffectsForNode
          key={node.id}
          node={node}
          valueType={valueType}
        />
      ))}
    </>
  );
}
