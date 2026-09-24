import React from 'react';

import { Checkboxes } from '@app/form-component';

import { AltinnSpinner } from 'src/components/AltinnSpinner';
import { useGetOptions } from 'src/features/options/useGetOptions';
import { useSaveValueToGroup } from 'src/features/saveToGroup/useSaveToGroup';
import { AllComponentValidations } from 'src/features/validation/ComponentValidations';
import { useIsValid } from 'src/features/validation/selectors/isValid';
import { useComponentStructureData } from 'src/utils/layout/useComponentStructureData';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

export const CheckboxContainerComponent = ({
  baseComponentId,
  overrideDisplay,
}: PropsFromGenericComponent<'Checkboxes'>) => {
  const item = useItemWhenType(baseComponentId, 'Checkboxes');
  const {
    layout,
    readOnly,
    textResourceBindings,
    required,
    labelSettings,
    alertOnChange,
    showLabelsInTable,
    dataModelBindings,
  } = item;

  const {
    options,
    isFetching,
    setData,
    selectedValues: selectedFromSimpleBinding,
  } = useGetOptions(baseComponentId, 'multi');
  const groupBinding = useSaveValueToGroup(dataModelBindings);
  const selectedValues = groupBinding.enabled ? groupBinding.selectedValues : selectedFromSimpleBinding;

  const isValid = useIsValid(baseComponentId);
  const { componentId, innerGrid, validationGrid, showValidationMessages } = useComponentStructureData(baseComponentId);

  if (isFetching) {
    return <AltinnSpinner />;
  }

  return (
    <Checkboxes
      componentId={componentId}
      options={options.map((option) => ({
        value: option.value,
        label: option.label,
        description: option.description,
        helpText: option.helpText,
      }))}
      value={selectedValues}
      onChange={(value, checked) => {
        if (groupBinding.enabled) {
          groupBinding.toggleValue(value);
        } else {
          setData(checked ? [...selectedValues, value] : selectedValues.filter((v) => v !== value));
        }
      }}
      readOnly={readOnly}
      required={required}
      isValid={isValid}
      alertOnChange={alertOnChange}
      layout={layout}
      title={textResourceBindings?.title}
      help={textResourceBindings?.help}
      description={textResourceBindings?.description}
      showOptionalMarking={!!labelSettings?.optionalIndicator}
      showLabelsInTable={showLabelsInTable}
      renderedInTable={overrideDisplay?.renderedInTable}
      renderLegend={overrideDisplay?.renderLegend}
      renderLabel={overrideDisplay?.renderLabel}
      innerGrid={innerGrid}
      validationGrid={validationGrid}
      validationMessages={
        showValidationMessages ? <AllComponentValidations baseComponentId={baseComponentId} /> : undefined
      }
    />
  );
};
