import { useEffect, useMemo } from 'react';

import deepEqual from 'fast-deep-equal';
import type { IDataModelBindingsOptionsSimple } from '@app/layout-contract/generated/common.generated';

import { FormStore } from 'src/features/form/FormContext';
import { useLanguage } from 'src/features/language/useLanguage';
import { useSetOptions } from 'src/features/options/useGetOptions';
import { useIsHidden } from 'src/utils/layout/hidden';
import { useDataModelBindingsFor } from 'src/utils/layout/hooks';
import type { IOptionInternal } from 'src/features/options/castOptionsToStrings';
import type { OptionsValueType } from 'src/features/options/useGetOptions';
import type { RuntimeNodeParent } from 'src/utils/layout/deriveRuntimeNodeRefs';

interface Props {
  baseComponentId: string;
  parent: RuntimeNodeParent;
  valueType: OptionsValueType;
  options: IOptionInternal[];
}

/**
 * This effect is responsible for setting the label/display value in the data model.
 */
export function EffectStoreLabel({ baseComponentId, parent, valueType, options }: Props) {
  const isHidden = useIsHidden(parent.baseId);
  const { langAsString } = useLanguage();
  const dataModelBindings = useDataModelBindingsFor(baseComponentId) as IDataModelBindingsOptionsSimple | undefined;
  const labelBindings = useMemo(
    () => (dataModelBindings?.label ? { label: dataModelBindings.label } : undefined),
    [dataModelBindings?.label],
  );
  const formData = FormStore.data.useFreshBindings(labelBindings, 'raw');
  const write = FormStore.data.useSetLeafValue();
  const { selectedValues } = useSetOptions(valueType, dataModelBindings, options);

  const translatedLabels = useMemo(
    () =>
      options
        .filter((option) => selectedValues.includes(option.value))
        .map((option) => option.label)
        .map((label) => langAsString(label)),
    [langAsString, options, selectedValues],
  );

  const labelValue =
    translatedLabels.length === 0 ? undefined : valueType === 'single' ? translatedLabels.at(0) : translatedLabels;
  const labelsHaveChanged = !deepEqual(labelValue, formData.label);
  const shouldSetData = labelsHaveChanged && !isHidden && dataModelBindings && 'label' in dataModelBindings;

  useEffect(() => {
    if (!shouldSetData || !dataModelBindings?.label) {
      return;
    }
    write({ reference: dataModelBindings.label, newValue: labelValue });
  }, [dataModelBindings, labelValue, shouldSetData, write]);

  return null;
}
