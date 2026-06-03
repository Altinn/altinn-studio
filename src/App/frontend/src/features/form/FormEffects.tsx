import React from 'react';

import { RunOptionsEffects } from 'src/features/options/RunOptionsEffects';
import { getComponentBehaviors, getComponentDef } from 'src/layout';
import { DataModelLocationProviderFromRowContexts } from 'src/utils/layout/DataModelLocation';
import { useDerivedLayoutNodes } from 'src/utils/layout/deriveLayoutNodes';

export function FormEffects() {
  const nodes = useDerivedLayoutNodes({ rowSource: 'current' });

  return (
    <>
      {nodes.map((node) => {
        if (!getComponentBehaviors(node.intermediateItem.type)?.canHaveOptions) {
          return null;
        }

        const valueType = getComponentDef(node.intermediateItem.type).getOptionsEffectValueType();
        if (!valueType) {
          return null;
        }

        return (
          <DataModelLocationProviderFromRowContexts
            key={node.id}
            rowContexts={node.rowContexts}
          >
            <RunOptionsEffects
              node={node}
              valueType={valueType}
            />
          </DataModelLocationProviderFromRowContexts>
        );
      })}
    </>
  );
}
