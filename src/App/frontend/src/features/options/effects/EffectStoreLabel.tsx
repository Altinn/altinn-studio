import { useEffect, useMemo } from 'react';

import deepEqual from 'fast-deep-equal';

import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { useLanguage } from 'src/features/language/useLanguage';
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
  options: IOptionInternal[];
}

/**
 * This effect is responsible for setting the label/display value in the data model.
 */
export function EffectStoreLabel({ item, parent, valueType, options }: Props) {
  const isHidden = useIsHidden(parent.baseId);
  const { langAsString } = useLanguage();
  const dataModelBindings = item.dataModelBindings as IDataModelBindingsOptionsSimple | undefined;
  const { formData, setValue } = useDataModelBindings(dataModelBindings);
  const { selectedValues } = useSetOptions(valueType, dataModelBindings, options);

  const translatedLabels = useMemo(
    () =>
      options
        .filter((option) => selectedValues.includes(option.value))
        .map((option) => option.label)
        .map((label) => langAsString(label)),
    [langAsString, options, selectedValues],
  );

  const labelsHaveChanged = !deepEqual(translatedLabels, 'label' in formData ? formData.label : undefined);
  const shouldSetData = labelsHaveChanged && !isHidden && dataModelBindings && 'label' in dataModelBindings;

  useEffect(() => {
    if (!shouldSetData) {
      return;
    }
    if (!translatedLabels || translatedLabels.length === 0) {
      setValue('label', undefined);
      return;
    } else if (valueType === 'single') {
      setValue('label', translatedLabels.at(0));
    } else {
      setValue('label', translatedLabels);
    }
  }, [setValue, shouldSetData, translatedLabels, valueType]);

  return null;
}
