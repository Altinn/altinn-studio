import { useEffect, useRef } from 'react';

import { useSetOptions } from 'src/features/options/useGetOptions';
import { useIsHidden } from 'src/utils/layout/hidden';
import type { IOptionInternal } from 'src/features/options/castOptionsToStrings';
import type { OptionsValueType } from 'src/features/options/useGetOptions';
import type { IDataModelBindingsOptionsSimple } from 'src/layout/common.generated';
import type { CompIntermediate, CompWithBehavior } from 'src/layout/layout';
import type { DerivedLayoutParent } from 'src/utils/layout/deriveLayoutNodes';

interface Props {
  item: CompIntermediate<CompWithBehavior<'canHaveOptions'>>;
  parent: DerivedLayoutParent;
  valueType: OptionsValueType;
  preselectedOption: IOptionInternal | undefined;
  options: IOptionInternal[];
}

/**
 * If given the 'preselectedOptionIndex' property, we should automatically select the given option index as soon
 * as options are ready. The code is complex to guard against overwriting data that has been set by the user.
 */
export function EffectPreselectedOptionIndex({ item, parent, preselectedOption, valueType, options }: Props) {
  const isHidden = useIsHidden(parent.baseId);
  const hasSelectedInitial = useRef(false);
  const dataModelBindings = item.dataModelBindings as IDataModelBindingsOptionsSimple | undefined;
  const { unsafeSelectedValues, setData } = useSetOptions(valueType, dataModelBindings, options);
  const hasValue = unsafeSelectedValues.length > 0;
  const shouldSelectOptionAutomatically =
    !hasValue && !hasSelectedInitial.current && preselectedOption !== undefined && isHidden !== true;

  useEffect(() => {
    if (shouldSelectOptionAutomatically) {
      setData([preselectedOption.value]);
      hasSelectedInitial.current = true;
    }
  }, [preselectedOption, shouldSelectOptionAutomatically, setData]);

  return null;
}
