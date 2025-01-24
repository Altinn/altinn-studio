import React from 'react';

import deepEqual from 'fast-deep-equal';

import { EffectPreselectedOptionIndex } from 'src/features/options/effects/EffectPreselectedOptionIndex';
import { EffectRemoveStaleValues } from 'src/features/options/effects/EffectRemoveStaleValues';
import { EffectSetDownstreamParameters } from 'src/features/options/effects/EffectSetDownstreamParameters';
import { EffectStoreLabel } from 'src/features/options/effects/EffectStoreLabel';
import { useFetchOptions, useFilteredAndSortedOptions } from 'src/features/options/useGetOptions';
import { NodesStateQueue } from 'src/utils/layout/generator/CommitQueue';
import { GeneratorInternal } from 'src/utils/layout/generator/GeneratorContext';
import { GeneratorData } from 'src/utils/layout/generator/GeneratorDataSources';
import { GeneratorCondition, StageFetchOptions } from 'src/utils/layout/generator/GeneratorStages';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import type { OptionsValueType } from 'src/features/options/useGetOptions';
import type { IDataModelBindingsOptionsSimple } from 'src/layout/common.generated';
import type { CompIntermediate, CompWithBehavior } from 'src/layout/layout';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

interface GeneratorOptionProps {
  valueType: OptionsValueType;
  allowEffects: boolean;
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

function StoreOptionsInNodeWorker({ valueType, allowEffects }: GeneratorOptionProps) {
  const item = GeneratorInternal.useIntermediateItem() as CompIntermediate<CompWithBehavior<'canHaveOptions'>>;
  const node = GeneratorInternal.useParent() as LayoutNode<CompWithBehavior<'canHaveOptions'>>;
  const dataModelBindings = item.dataModelBindings as IDataModelBindingsOptionsSimple | undefined;

  const dataSources = GeneratorData.useExpressionDataSources();
  const { unsorted, isFetching, downstreamParameters } = useFetchOptions({ node, item, dataSources });
  const { options, preselectedOption } = useFilteredAndSortedOptions({
    unsorted,
    valueType,
    node,
    item,
    dataSources,
  });

  const hasBeenSet = NodesInternal.useNodeData(
    node,
    (data) => deepEqual(data.options, options) && data.isFetchingOptions === isFetching,
  );

  NodesStateQueue.useSetNodeProp({ node, prop: 'options', value: options }, !hasBeenSet && !isFetching);
  NodesStateQueue.useSetNodeProp({ node, prop: 'isFetchingOptions', value: isFetching }, !hasBeenSet);

  if (isFetching || !hasBeenSet || !allowEffects) {
    // No need to run effects while fetching or if the data has not been set yet
    return false;
  }

  // Quickfix to fix simpleBinding being cleared as stale in FileUploadWithTag,
  // we don't store option values here so it makes no sense to do this,
  // consider solving this more elegantly in the future.
  // AFAIK, stale values are not removed from attachment tags, maybe they should?
  const shouldRemoveStaleValues =
    !node.isType('FileUploadWithTag') && !('renderAsSummary' in item && item.renderAsSummary);

  return (
    <>
      {shouldRemoveStaleValues && (
        <EffectRemoveStaleValues
          valueType={valueType}
          options={options}
        />
      )}
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
