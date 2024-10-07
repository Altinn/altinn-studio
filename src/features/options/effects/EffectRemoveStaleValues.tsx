import deepEqual from 'fast-deep-equal';

import { useSetOptions } from 'src/features/options/useGetOptions';
import { useAsRef } from 'src/hooks/useAsRef';
import { GeneratorInternal } from 'src/utils/layout/generator/GeneratorContext';
import { Hidden, NodesInternal } from 'src/utils/layout/NodesContext';
import type { IOptionInternal } from 'src/features/options/castOptionsToStrings';
import type { OptionsValueType } from 'src/features/options/useGetOptions';
import type { IDataModelBindingsOptionsSimple } from 'src/layout/common.generated';
import type { CompIntermediate, CompWithBehavior } from 'src/layout/layout';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

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
  const node = GeneratorInternal.useParent() as LayoutNode<CompWithBehavior<'canHaveOptions'>>;
  const isNodeHidden = Hidden.useIsHidden(node);

  const item = GeneratorInternal.useIntermediateItem() as CompIntermediate<CompWithBehavior<'canHaveOptions'>>;
  const dataModelBindings = item.dataModelBindings as IDataModelBindingsOptionsSimple | undefined;
  const setResult = useSetOptions(valueType, dataModelBindings, options);
  const setResultAsRef = useAsRef(setResult);
  const optionsAsRef = useAsRef(options);
  const itemsToRemove = getItemsToRemove(options, setResult.unsafeSelectedValues);

  NodesInternal.useEffectWhenReady(() => {
    const { unsafeSelectedValues, setData } = setResultAsRef.current;
    const options = optionsAsRef.current;
    if (itemsToRemove.length === 0 || isNodeHidden || !options) {
      return;
    }

    const freshItemsToRemove = getItemsToRemove(optionsAsRef.current, unsafeSelectedValues);
    if (freshItemsToRemove.length > 0 && deepEqual(freshItemsToRemove, itemsToRemove)) {
      setData(unsafeSelectedValues.filter((v) => !itemsToRemove.includes(v)));
    }
  }, [isNodeHidden, itemsToRemove, optionsAsRef, setResultAsRef]);

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
