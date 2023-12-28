import React from 'react';

import { Select } from '@digdir/design-system-react';

import { FD } from 'src/features/formData/FormDataWrite';
import { useLanguage } from 'src/features/language/useLanguage';
import { useGetOptions } from 'src/features/options/useGetOptions';
import { useFormattedOptions } from 'src/hooks/useFormattedOptions';
import type { PropsFromGenericComponent } from 'src/layout';

export type IMultipleSelectProps = PropsFromGenericComponent<'MultipleSelect'>;
const defaultSelectedOptions: string[] = [];
export function MultipleSelectComponent({ node, isValid, overrideDisplay }: IMultipleSelectProps) {
  const { id, readOnly, textResourceBindings, dataModelBindings } = node.item;
  const value = FD.usePickFreshString(dataModelBindings?.simpleBinding);
  const saveValue = FD.useSetForBindings(dataModelBindings);
  const debounce = FD.useDebounceImmediately();
  const selected = value && value.length > 0 ? value.split(',') : defaultSelectedOptions;
  const { options: calculatedOptions } = useGetOptions({
    ...node.item,
    node,
    metadata: {
      setValue: (metadata) => {
        saveValue('metadata', metadata);
      },
    },
    formData: {
      type: 'multi',
      values: selected,
      setValues: (values) => {
        saveValue('simpleBinding', values.join(','));
      },
    },
    removeDuplicates: true,
  });
  const { langAsString } = useLanguage();

  const formattedOptions = useFormattedOptions(calculatedOptions, true);

  const handleChange = (values: string[]) => {
    saveValue('simpleBinding', values.join(','));
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
      onBlur={debounce}
      value={selectedValues}
      aria-label={overrideDisplay?.renderedInTable ? langAsString(textResourceBindings?.title) : undefined}
    />
  );
}
