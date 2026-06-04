import React from 'react';

import { DropdownLayout } from '@app/form-component';
import type { DropdownOption } from '@app/form-component';

import { FormStore } from 'src/features/form/FormContext';
import { useGetOptions } from 'src/features/options/useGetOptions';
import { useIsValid } from 'src/features/validation/selectors/isValid';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

export function DropdownComponent({ baseComponentId, overrideDisplay }: PropsFromGenericComponent<'Dropdown'>) {
  const { id, readOnly, required, grid, alertOnChange, labelSettings, textResourceBindings } = useItemWhenType(
    baseComponentId,
    'Dropdown',
  );

  const isValid = useIsValid(baseComponentId);
  const { options, isFetching, selectedValues, setData } = useGetOptions(baseComponentId, 'single');
  const debounce = FormStore.data.useDebounceImmediately();

  const dropdownOptions: DropdownOption[] = options.map((option) => ({
    value: option.value,
    label: option.label,
    description: option.description,
  }));

  return (
    <ComponentStructureWrapper baseComponentId={baseComponentId}>
      <DropdownLayout
        id={id}
        title={textResourceBindings?.title}
        description={textResourceBindings?.description}
        help={textResourceBindings?.help}
        required={required}
        readOnly={readOnly}
        showOptionalMarking={!!labelSettings?.optionalIndicator}
        alertOnChange={alertOnChange}
        grid={grid?.labelGrid}
        renderLabel={overrideDisplay?.renderLabel}
        renderedInTable={overrideDisplay?.renderedInTable}
        options={dropdownOptions}
        value={selectedValues.at(0)}
        error={!isValid}
        loading={isFetching}
        onChange={(value) => setData(value !== undefined ? [value] : [])}
        onBlur={() => debounce('blur')}
      />
    </ComponentStructureWrapper>
  );
}
