import { useEffect } from 'react';

import deepEqual from 'fast-deep-equal';

import { useSetOptions } from 'src/features/options/useGetOptions';
import { useAsRef } from 'src/hooks/useAsRef';
import { GeneratorInternal } from 'src/utils/layout/generator/GeneratorContext';
import { useIsHidden } from 'src/utils/layout/hidden';
import type { IOptionInternal } from 'src/features/options/castOptionsToStrings';
import type { OptionsValueType } from 'src/features/options/useGetOptions';
import type { IDataModelBindingsOptionsSimple } from 'src/layout/common.generated';
import type { CompIntermediate, CompWithBehavior } from 'src/layout/layout';

interface Props {
  valueType: OptionsValueType;
  options: IOptionInternal[];
}

/**
 * If options has changed and the values no longer include the current value, we should clear the value.
 * This is especially useful when fetching options from an API with mapping, or when generating options
 * from a repeating group. If the options changed and the selected option (or selected row in a repeating group)
 * is gone, we should not save stale/invalid data, so we clear it.
 */
export function EffectRemoveStaleValues({ valueType, options }: Props) {
  const parent = GeneratorInternal.useParent();
  const isHidden = useIsHidden(parent.baseId);

  const item = GeneratorInternal.useIntermediateItem() as CompIntermediate<CompWithBehavior<'canHaveOptions'>>;
  const dataModelBindings = item.dataModelBindings as IDataModelBindingsOptionsSimple | undefined;
  const setResult = useSetOptions(valueType, dataModelBindings, options);
  const setResultAsRef = useAsRef(setResult);
  const optionsAsRef = useAsRef(options);
  const itemsToRemove = getItemsToRemove(options, setResult.unsafeSelectedValues);

  useEffect(() => {
    const { unsafeSelectedValues, setData } = setResultAsRef.current;
    const options = optionsAsRef.current;
    if (itemsToRemove.length === 0 || isHidden || !options) {
      return;
    }

    const freshItemsToRemove = getItemsToRemove(optionsAsRef.current, unsafeSelectedValues);
    if (freshItemsToRemove.length > 0 && deepEqual(freshItemsToRemove, itemsToRemove)) {
      setData(unsafeSelectedValues.filter((v) => !itemsToRemove.includes(v)));
    }
  }, [isHidden, itemsToRemove, optionsAsRef, setResultAsRef]);

  return null;
}

const emptyArray: never[] = [];
function getItemsToRemove(options: IOptionInternal[], unsafeSelected: string[]): string[] {
  if (!options) {
    return emptyArray;
  }
  const itemsToRemove = unsafeSelected.filter((v) => !options.find((option) => option.value === v));
  if (itemsToRemove.length === 0) {
    return emptyArray;
  }
  return itemsToRemove;
}
