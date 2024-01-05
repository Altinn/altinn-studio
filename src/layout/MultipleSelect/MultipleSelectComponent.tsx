import React from 'react';

import { Select } from '@digdir/design-system-react';

import { FD } from 'src/features/formData/FormDataWrite';
import { useLanguage } from 'src/features/language/useLanguage';
import { useGetOptions } from 'src/features/options/useGetOptions';
import { useFormattedOptions } from 'src/hooks/useFormattedOptions';
import type { PropsFromGenericComponent } from 'src/layout';

export type IMultipleSelectProps = PropsFromGenericComponent<'MultipleSelect'>;
export function MultipleSelectComponent({ node, isValid, overrideDisplay }: IMultipleSelectProps) {
  const { id, readOnly, textResourceBindings } = node.item;
  const debounce = FD.useDebounceImmediately();
  const {
    options: calculatedOptions,
    currentStringy,
    setData,
  } = useGetOptions({
    ...node.item,
    node,
    removeDuplicates: true,
    valueType: 'multi',
  });
  const { langAsString } = useLanguage();

  const formattedOptions = useFormattedOptions(calculatedOptions, true);

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
      onChange={setData}
      onBlur={debounce}
      value={currentStringy}
      aria-label={overrideDisplay?.renderedInTable ? langAsString(textResourceBindings?.title) : undefined}
    />
  );
}
