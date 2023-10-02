import React from 'react';

import { Select } from '@digdir/design-system-react';

import { useGetOptions } from 'src/features/options/useGetOptions';
import { useDelayedSavedState } from 'src/hooks/useDelayedSavedState';
import { useFormattedOptions } from 'src/hooks/useFormattedOptions';
import { useLanguage } from 'src/hooks/useLanguage';
import type { PropsFromGenericComponent } from 'src/layout';

export type IMultipleSelectProps = PropsFromGenericComponent<'MultipleSelect'>;
const defaultSelectedOptions: string[] = [];
export function MultipleSelectComponent({
  node,
  handleDataChange,
  formData,
  isValid,
  overrideDisplay,
}: IMultipleSelectProps) {
  const { id, readOnly, textResourceBindings } = node.item;
  const { value: _value, setValue, saveValue } = useDelayedSavedState(handleDataChange, formData?.simpleBinding);
  const value = _value ?? formData?.simpleBinding ?? '';
  const selected = value && value.length > 0 ? value.split(',') : defaultSelectedOptions;
  const { options: calculatedOptions } = useGetOptions({
    ...node.item,
    node,
    formData: {
      type: 'multi',
      values: selected,
      setValues: (values) => {
        setValue(values.join(','));
      },
    },
    removeDuplicates: true,
  });
  const { langAsString } = useLanguage();

  const formattedOptions = useFormattedOptions(calculatedOptions, true);

  const handleChange = (values: string[]) => {
    setValue(values.join(','));
  };

  const selectedValues = calculatedOptions
    ?.filter((option) => value?.split(',').includes(option.value))
    .map((option) => option.value);

  return (
    <Select
      label={langAsString('general.choose')}
      hideLabel={true}
      options={formattedOptions}
      deleteButtonLabel={langAsString('general.delete')}
      multiple
      inputId={id}
      disabled={readOnly}
      error={!isValid}
      onChange={handleChange}
      onBlur={saveValue}
      value={selectedValues}
      aria-label={overrideDisplay?.renderedInTable ? langAsString(textResourceBindings?.title) : undefined}
    />
  );
}
