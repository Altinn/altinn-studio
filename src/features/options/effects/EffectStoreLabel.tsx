import { useMemo } from 'react';

import deepEqual from 'fast-deep-equal';

import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { useLanguage } from 'src/features/language/useLanguage';
import { useSetOptions } from 'src/features/options/useGetOptions';
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
 * This effect is responsible for setting the label/display value in the data model.
 */
export function EffectStoreLabel({ valueType, options }: Props) {
  const item = GeneratorInternal.useIntermediateItem() as CompIntermediate<CompWithBehavior<'canHaveOptions'>>;
  const node = GeneratorInternal.useParent() as LayoutNode<CompWithBehavior<'canHaveOptions'>>;
  const isNodeHidden = Hidden.useIsHidden(node);
  const { langAsString } = useLanguage();
  const dataModelBindings = item.dataModelBindings as IDataModelBindingsOptionsSimple | undefined;
  const { formData, setValue } = useDataModelBindings(dataModelBindings);
  const unsafeSelectedValues = useSetOptions(valueType, dataModelBindings, options).unsafeSelectedValues;

  const translatedLabels = useMemo(
    () =>
      options
        ?.filter((option) => unsafeSelectedValues.includes(option.value))
        .map((option) => option.label)
        .map((label) => langAsString(label)),
    [langAsString, options, unsafeSelectedValues],
  );

  const labelsHaveChanged = !deepEqual(translatedLabels, 'label' in formData ? formData.label : undefined);
  const shouldSetData = labelsHaveChanged && !isNodeHidden && dataModelBindings && 'label' in dataModelBindings;

  NodesInternal.useEffectWhenReady(() => {
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
