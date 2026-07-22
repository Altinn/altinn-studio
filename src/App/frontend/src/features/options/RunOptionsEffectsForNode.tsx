import React from 'react';

import { FormStore } from 'src/features/form/FormContext';
import { EffectPreselectedOptionIndex } from 'src/features/options/effects/EffectPreselectedOptionIndex';
import { EffectRemoveStaleValues } from 'src/features/options/effects/EffectRemoveStaleValues';
import { EffectSetDownstreamParameters } from 'src/features/options/effects/EffectSetDownstreamParameters';
import { EffectStoreLabel } from 'src/features/options/effects/EffectStoreLabel';
import { EffectStoreLabelInGroup } from 'src/features/options/effects/EffectStoreLabelInGroup';
import { useFetchOptions, useFilteredAndSortedOptions } from 'src/features/options/useGetOptions';
import { useIsHidden } from 'src/utils/layout/hidden';
import { getRuntimeIntermediateItem } from 'src/utils/layout/rowContext';
import type { OptionsValueType } from 'src/features/options/useGetOptions';
import type { IDataModelBindingsForGroupCheckbox } from 'src/layout/Checkboxes/config.generated';
import type { IDataModelBindingsOptionsSimple } from 'src/layout/common.generated';
import type { CompIntermediate, CompWithBehavior } from 'src/layout/layout';
import type { IDataModelBindingsForGroupMultiselect } from 'src/layout/MultipleSelect/config.generated';
import type { RuntimeNodeRef } from 'src/utils/layout/deriveRuntimeNodeRefs';

interface RunOptionEffectsProps {
  valueType: OptionsValueType;
  node: RuntimeNodeRef;
}

export function RunOptionsEffectsForNode({ valueType, node }: RunOptionEffectsProps) {
  const isHidden = useIsHidden(node.baseId, { respectPageOrder: true });

  if (isHidden) {
    return null;
  }

  return (
    <RunVisibleOptionsEffects
      node={node}
      valueType={valueType}
    />
  );
}

function RunVisibleOptionsEffects({ valueType, node }: RunOptionEffectsProps) {
  const isReadOnly = FormStore.useIsReadOnly();
  const lookups = FormStore.bootstrap.useLayoutLookups();
  const item = getRuntimeIntermediateItem(lookups.getComponent(node.baseId), node.rowContexts) as CompIntermediate<
    CompWithBehavior<'canHaveOptions'>
  >;
  const dataModelBindings = item.dataModelBindings as IDataModelBindingsOptionsSimple | undefined;
  const groupBindings = item.dataModelBindings as
    | IDataModelBindingsForGroupCheckbox
    | IDataModelBindingsForGroupMultiselect;
  const { unsorted, isFetching, downstreamParameters } = useFetchOptions({ item });
  const { options, preselectedOption } = useFilteredAndSortedOptions({ unsorted, valueType, item });

  if (isFetching || isReadOnly) {
    // No need to run effects while fetching or if the data has not been set yet
    return false;
  }

  // Quickfix to fix simpleBinding being cleared as stale in FileUploadWithTag,
  // we don't store option values here so it makes no sense to do this,
  // consider solving this more elegantly in the future.
  // AFAIK, stale values are not removed from attachment tags, maybe they should?
  const parentComponent = node.parent.type === 'node' ? lookups.getComponent(node.parent.baseId) : undefined;
  const shouldRemoveStaleValues =
    parentComponent?.type !== 'FileUploadWithTag' && !('renderAsSummary' in item && item.renderAsSummary);

  return (
    <>
      {shouldRemoveStaleValues && (
        <EffectRemoveStaleValues
          item={item}
          parent={node.parent}
          valueType={valueType}
          options={options}
        />
      )}
      {preselectedOption !== undefined && (
        <EffectPreselectedOptionIndex
          item={item}
          parent={node.parent}
          preselectedOption={preselectedOption}
          valueType={valueType}
          options={options}
        />
      )}
      {downstreamParameters && dataModelBindings && dataModelBindings.metadata ? (
        <EffectSetDownstreamParameters
          item={item}
          downstreamParameters={downstreamParameters}
        />
      ) : null}
      {dataModelBindings && dataModelBindings.label && !!groupBindings.group ? (
        <EffectStoreLabelInGroup
          item={item}
          parent={node.parent}
          options={options}
        />
      ) : null}
      {dataModelBindings && dataModelBindings.label && !groupBindings.group ? (
        <EffectStoreLabel
          item={item}
          parent={node.parent}
          valueType={valueType}
          options={options}
        />
      ) : null}
    </>
  );
}
