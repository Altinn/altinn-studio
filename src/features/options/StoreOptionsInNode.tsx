import React from 'react';

import { EffectPreselectedOptionIndex } from 'src/features/options/effects/EffectPreselectedOptionIndex';
import { EffectRemoveStaleValues } from 'src/features/options/effects/EffectRemoveStaleValues';
import { EffectSetDownstreamParameters } from 'src/features/options/effects/EffectSetDownstreamParameters';
import { EffectStoreLabel } from 'src/features/options/effects/EffectStoreLabel';
import { useFetchOptions, useSortedOptions } from 'src/features/options/useGetOptions';
import { NodesStateQueue } from 'src/utils/layout/generator/CommitQueue';
import { GeneratorInternal } from 'src/utils/layout/generator/GeneratorContext';
import { GeneratorCondition, StageFetchOptions } from 'src/utils/layout/generator/GeneratorStages';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import type { OptionsValueType } from 'src/features/options/useGetOptions';
import type { IDataModelBindingsOptionsSimple } from 'src/layout/common.generated';
import type { CompIntermediate, CompWithBehavior } from 'src/layout/layout';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

interface GeneratorOptionProps {
  valueType: OptionsValueType;
}

export function StoreOptionsInNode(props: GeneratorOptionProps) {
  return (
    <GeneratorCondition
      stage={StageFetchOptions}
      mustBeAdded='parent'
    >
      <StoreOptionsInNodeWorker {...props} />
    </GeneratorCondition>
  );
}

function StoreOptionsInNodeWorker({ valueType }: GeneratorOptionProps) {
  const item = GeneratorInternal.useIntermediateItem() as CompIntermediate<CompWithBehavior<'canHaveOptions'>>;
  const node = GeneratorInternal.useParent() as LayoutNode<CompWithBehavior<'canHaveOptions'>>;
  const dataModelBindings = item.dataModelBindings as IDataModelBindingsOptionsSimple | undefined;

  const { unsorted, isFetching, downstreamParameters } = useFetchOptions({ node, item });
  const { options, preselectedOption } = useSortedOptions({ unsorted, valueType, item });

  const hasBeenSet = NodesInternal.useNodeData(
    node,
    (data) => data.options === options && data.isFetchingOptions === isFetching,
  );

  NodesStateQueue.useSetNodeProp({ node, prop: 'options', value: options }, !hasBeenSet && !isFetching);
  NodesStateQueue.useSetNodeProp({ node, prop: 'isFetchingOptions', value: isFetching }, !hasBeenSet);

  if (isFetching || !hasBeenSet) {
    // No need to run effects while fetching or if the data has not been set yet
    return false;
  }

  return (
    <>
      <EffectRemoveStaleValues
        valueType={valueType}
        options={options}
      />
      {preselectedOption !== undefined && (
        <EffectPreselectedOptionIndex
          preselectedOption={preselectedOption}
          valueType={valueType}
          options={options}
        />
      )}
      {downstreamParameters && dataModelBindings && dataModelBindings.metadata ? (
        <EffectSetDownstreamParameters downstreamParameters={downstreamParameters} />
      ) : null}
      {dataModelBindings && dataModelBindings.label ? (
        <EffectStoreLabel
          valueType={valueType}
          options={options}
        />
      ) : null}
    </>
  );
}
