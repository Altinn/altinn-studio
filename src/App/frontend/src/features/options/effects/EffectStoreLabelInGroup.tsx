import { useEffect, useMemo } from 'react';

import dot from 'dot-object';
import deepEqual from 'fast-deep-equal';

import { FD } from 'src/features/formData/FormDataWrite';
import { useLanguage } from 'src/features/language/useLanguage';
import { toRelativePath } from 'src/features/saveToGroup/useSaveToGroup';
import { GeneratorInternal } from 'src/utils/layout/generator/GeneratorContext';
import { useIsHidden } from 'src/utils/layout/hidden';
import type { IOptionInternal } from 'src/features/options/castOptionsToStrings';
import type { IDataModelBindingsForGroupCheckbox } from 'src/layout/Checkboxes/config.generated';
import type { CompIntermediate, CompWithBehavior } from 'src/layout/layout';
import type { IDataModelBindingsForGroupMultiselect } from 'src/layout/MultipleSelect/config.generated';

type Row = Record<string, unknown>;

interface Props {
  options: IOptionInternal[];
}

/**
 * This effect is responsible for setting the label/display value in the data model.
 */
export function EffectStoreLabelInGroup({ options }: Props) {
  const item = GeneratorInternal.useIntermediateItem() as CompIntermediate<CompWithBehavior<'canHaveOptions'>>;
  const parent = GeneratorInternal.useParent();
  const isHidden = useIsHidden(parent.baseId);
  const { langAsString } = useLanguage();
  const setLeafValue = FD.useSetLeafValue();
  const formDataSelector = FD.useCurrentSelector();

  const bindings = item.dataModelBindings as IDataModelBindingsForGroupCheckbox | IDataModelBindingsForGroupMultiselect;

  const groupBinding = bindings.group;
  const groupRows = FD.useDebouncedPick(groupBinding) as Row[];

  const checkedPath = toRelativePath(groupBinding, bindings.checked);
  const valuePath = toRelativePath(groupBinding, bindings.simpleBinding);
  const labelPath = toRelativePath(groupBinding, bindings.label);

  const selectedRows = useMemo(
    () =>
      groupRows
        ?.map((row, index) => {
          const value = valuePath ? dot.pick(valuePath, row)?.toString() : undefined;
          const matchedOption = options.find((option) => option.value === value);
          const translatedLabel = matchedOption?.label ? langAsString(matchedOption.label) : undefined;
          const isChecked = checkedPath ? dot.pick(checkedPath, row) : true;
          const label = labelPath ? dot.pick(labelPath, row) : undefined;

          return isChecked ? { index, data: row, translatedLabel, label } : null;
        })
        .filter((row): row is Exclude<typeof row, null> => row !== null),
    [labelPath, groupRows, options, checkedPath, valuePath, langAsString],
  );

  const translatedLabels = selectedRows?.map((row) => row.translatedLabel).filter(Boolean);

  const formDataLabels = groupRows
    ?.map((row) => (labelPath ? dot.pick(labelPath, row) : undefined))
    .filter((label): label is string => Boolean(label));

  const shouldUpdate = !deepEqual(translatedLabels, formDataLabels) && !isHidden && 'label' in bindings;

  useEffect(() => {
    if (!shouldUpdate || !translatedLabels?.length) {
      return;
    }

    const freshGroupRows = groupBinding ? (formDataSelector(groupBinding) as Row[]) : undefined;
    if (deepEqual(freshGroupRows, groupRows)) {
      selectedRows?.forEach(({ index, translatedLabel }) => {
        if (bindings.group && bindings.label && translatedLabel) {
          const field = `${bindings.group.field}[${index}].${labelPath}`;
          setLeafValue({ reference: { ...bindings.label, field }, newValue: translatedLabel });
        }
      });
    }
  }, [
    bindings,
    formDataSelector,
    groupBinding,
    groupRows,
    labelPath,
    selectedRows,
    setLeafValue,
    shouldUpdate,
    translatedLabels,
  ]);

  return null;
}
