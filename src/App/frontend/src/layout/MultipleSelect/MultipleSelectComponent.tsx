import React from 'react';

import { MultipleSelect } from '@app/form-component';

import { AltinnSpinner } from 'src/components/AltinnSpinner';
import { useGetOptions } from 'src/features/options/useGetOptions';
import { useSaveValueToGroup } from 'src/features/saveToGroup/useSaveToGroup';
import { AllComponentValidations } from 'src/features/validation/ComponentValidations';
import { useIsValid } from 'src/features/validation/selectors/isValid';
import { useComponentStructureData } from 'src/utils/layout/useComponentStructureData';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

export function MultipleSelectComponent({
  baseComponentId,
  overrideDisplay,
}: PropsFromGenericComponent<'MultipleSelect'>) {
  const item = useItemWhenType(baseComponentId, 'MultipleSelect');
  const { readOnly, required, alertOnChange, grid, textResourceBindings, labelSettings, dataModelBindings } = item;

  const isValid = useIsValid(baseComponentId);
  const {
    options,
    isFetching,
    selectedValues: selectedFromSimpleBinding,
    setData,
  } = useGetOptions(baseComponentId, 'multi');
  const groupBinding = useSaveValueToGroup(dataModelBindings);
  const selectedValues = groupBinding.enabled ? groupBinding.selectedValues : selectedFromSimpleBinding;
  const { componentId, innerGrid, validationGrid, showValidationMessages } = useComponentStructureData(baseComponentId);

  if (isFetching) {
    return <AltinnSpinner />;
  }

  return (
    <MultipleSelect
      componentId={componentId}
      options={options.map((option) => ({
        value: option.value,
        label: option.label,
        description: option.description,
      }))}
      values={selectedValues}
      onChange={(values) => (groupBinding.enabled ? groupBinding.setCheckedValues(values) : setData(values))}
      readOnly={readOnly}
      required={required}
      isValid={isValid}
      alertOnChange={alertOnChange}
      title={textResourceBindings?.title}
      help={textResourceBindings?.help}
      description={textResourceBindings?.description}
      showOptionalMarking={!!labelSettings?.optionalIndicator}
      labelGrid={grid?.labelGrid}
      renderedInTable={overrideDisplay?.renderedInTable}
      renderLabel={overrideDisplay?.renderLabel}
      innerGrid={innerGrid}
      validationGrid={validationGrid}
      validationMessages={
        showValidationMessages ? <AllComponentValidations baseComponentId={baseComponentId} /> : undefined
      }
    />
  );
}
