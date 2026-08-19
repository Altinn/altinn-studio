import React from 'react';

import { Dropdown } from '@app/form-component';

import { AltinnSpinner } from 'src/components/AltinnSpinner';
import { useGetOptions } from 'src/features/options/useGetOptions';
import { AllComponentValidations } from 'src/features/validation/ComponentValidations';
import { useIsValid } from 'src/features/validation/selectors/isValid';
import { useComponentStructureData } from 'src/utils/layout/useComponentStructureData';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

export function DropdownComponent({ baseComponentId, overrideDisplay }: PropsFromGenericComponent<'Dropdown'>) {
  const item = useItemWhenType(baseComponentId, 'Dropdown');
  const { readOnly, required, alertOnChange, grid, textResourceBindings, labelSettings } = item;

  const isValid = useIsValid(baseComponentId);
  const { options, isFetching, selectedValues, setData } = useGetOptions(baseComponentId, 'single');
  const { componentId, innerGrid, validationGrid, showValidationMessages } = useComponentStructureData(baseComponentId);

  if (isFetching) {
    return <AltinnSpinner />;
  }

  return (
    <Dropdown
      componentId={componentId}
      options={options.map((option) => ({
        value: option.value,
        label: option.label,
        description: option.description,
      }))}
      value={selectedValues.at(0) ?? ''}
      onChange={(value) => setData(value ? [value] : [])}
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
