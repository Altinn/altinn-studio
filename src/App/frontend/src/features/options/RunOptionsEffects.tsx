import React from 'react';

import { useLayoutLookups } from 'src/features/form/layout/LayoutsContext';
import { EffectPreselectedOptionIndex } from 'src/features/options/effects/EffectPreselectedOptionIndex';
import { EffectRemoveStaleValues } from 'src/features/options/effects/EffectRemoveStaleValues';
import { EffectSetDownstreamParameters } from 'src/features/options/effects/EffectSetDownstreamParameters';
import { EffectStoreLabel } from 'src/features/options/effects/EffectStoreLabel';
import { EffectStoreLabelInGroup } from 'src/features/options/effects/EffectStoreLabelInGroup';
import { useFetchOptions, useFilteredAndSortedOptions } from 'src/features/options/useGetOptions';
import { GeneratorInternal } from 'src/utils/layout/generator/GeneratorContext';
import { WhenParentAdded } from 'src/utils/layout/generator/GeneratorStages';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import type { OptionsValueType } from 'src/features/options/useGetOptions';
import type { IDataModelBindingsForGroupCheckbox } from 'src/layout/Checkboxes/config.generated';
import type { IDataModelBindingsOptionsSimple } from 'src/layout/common.generated';
import type { CompIntermediate, CompWithBehavior } from 'src/layout/layout';
import type { IDataModelBindingsForGroupMultiselect } from 'src/layout/MultipleSelect/config.generated';

interface RunOptionEffectsProps {
  valueType: OptionsValueType;
}

export function RunOptionsEffects({ valueType }: RunOptionEffectsProps) {
  const isReadOnly = NodesInternal.useIsReadOnly();
  const item = GeneratorInternal.useIntermediateItem() as CompIntermediate<CompWithBehavior<'canHaveOptions'>>;
  const parent = GeneratorInternal.useParent();
  const lookups = useLayoutLookups();
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
  const parentComponent = parent.type === 'node' ? lookups.getComponent(parent.baseId) : undefined;
  const shouldRemoveStaleValues =
    parentComponent?.type !== 'FileUploadWithTag' && !('renderAsSummary' in item && item.renderAsSummary);

  return (
    <WhenParentAdded>
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
      {dataModelBindings && dataModelBindings.label && !!groupBindings.group ? (
        <EffectStoreLabelInGroup options={options} />
      ) : null}
      {dataModelBindings && dataModelBindings.label && !groupBindings.group ? (
        <EffectStoreLabel
          valueType={valueType}
          options={options}
        />
      ) : null}
    </WhenParentAdded>
  );
}
