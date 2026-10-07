import React from 'react';

import type { IDataModelBindingsOptionsSimple } from '@app/layout-contract/generated/common.generated';
import type { IDataModelBindingsForGroupCheckbox } from '@app/layout-contract/generated/components/Checkboxes/config.generated';
import type { IDataModelBindingsForGroupMultiselect } from '@app/layout-contract/generated/components/MultipleSelect/config.generated';

import { FormStore } from 'src/features/form/FormContext';
import { EffectPreselectedOptionIndex } from 'src/features/options/effects/EffectPreselectedOptionIndex';
import { EffectRemoveStaleValues } from 'src/features/options/effects/EffectRemoveStaleValues';
import { EffectSetDownstreamParameters } from 'src/features/options/effects/EffectSetDownstreamParameters';
import { EffectStoreLabel } from 'src/features/options/effects/EffectStoreLabel';
import { EffectStoreLabelInGroup } from 'src/features/options/effects/EffectStoreLabelInGroup';
import { useFetchOptions, useFilteredAndSortedOptions } from 'src/features/options/useGetOptions';
import { useIsHidden } from 'src/utils/layout/hidden';
import { useComponentConfig, useDataModelBindingsFor } from 'src/utils/layout/hooks';
import type { OptionsValueType } from 'src/features/options/useGetOptions';
import type { CompExternal, CompWithBehavior } from 'src/layout/layout';
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
  const config = useComponentConfig(node.baseId) as CompExternal<CompWithBehavior<'canHaveOptions'>>;
  const bindings = useDataModelBindingsFor(node.baseId);
  const dataModelBindings = bindings as IDataModelBindingsOptionsSimple | undefined;
  const groupBindings = bindings as IDataModelBindingsForGroupCheckbox | IDataModelBindingsForGroupMultiselect;
  const { unsorted, isFetching, downstreamParameters } = useFetchOptions({ config });
  const { options, preselectedOption } = useFilteredAndSortedOptions({ unsorted, valueType, config });

  if (isFetching || isReadOnly) {
    // No need to run effects while fetching or if the data has not been set yet
    return false;
  }

  // Quickfix to fix simpleBinding being cleared as stale in FileUpload,
  // we don't store option values here so it makes no sense to do this,
  // consider solving this more elegantly in the future.
  // AFAIK, stale values are not removed from attachment tags, maybe they should?
  const shouldRemoveStaleValues =
    config?.type !== 'FileUpload' && !('renderAsSummary' in config && config.renderAsSummary);

  return (
    <>
      {shouldRemoveStaleValues && (
        <EffectRemoveStaleValues
          baseComponentId={node.baseId}
          parent={node.parent}
          valueType={valueType}
          options={options}
        />
      )}
      {preselectedOption !== undefined && (
        <EffectPreselectedOptionIndex
          baseComponentId={node.baseId}
          parent={node.parent}
          preselectedOption={preselectedOption}
          valueType={valueType}
          options={options}
        />
      )}
      {downstreamParameters && dataModelBindings && dataModelBindings.metadata ? (
        <EffectSetDownstreamParameters
          baseComponentId={node.baseId}
          downstreamParameters={downstreamParameters}
        />
      ) : null}
      {dataModelBindings && dataModelBindings.label && !!groupBindings.group ? (
        <EffectStoreLabelInGroup
          baseComponentId={node.baseId}
          parent={node.parent}
          options={options}
        />
      ) : null}
      {dataModelBindings && dataModelBindings.label && !groupBindings.group ? (
        <EffectStoreLabel
          baseComponentId={node.baseId}
          parent={node.parent}
          valueType={valueType}
          options={options}
        />
      ) : null}
    </>
  );
}
