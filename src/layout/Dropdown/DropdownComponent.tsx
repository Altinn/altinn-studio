import React from 'react';

import { Select } from '@digdir/design-system-react';

import { AltinnSpinner } from 'src/components/AltinnSpinner';
import { FD } from 'src/features/formData/FormDataWrite';
import { useLanguage } from 'src/features/language/useLanguage';
import { useGetOptions } from 'src/features/options/useGetOptions';
import { useFormattedOptions } from 'src/hooks/useFormattedOptions';
import type { PropsFromGenericComponent } from 'src/layout';

export type IDropdownProps = PropsFromGenericComponent<'Dropdown'>;

export function DropdownComponent({ node, isValid, overrideDisplay }: IDropdownProps) {
  const { id, readOnly, textResourceBindings, dataModelBindings } = node.item;
  const { langAsString } = useLanguage();

  const saveValue = FD.useSetForBindings(dataModelBindings);
  const debounce = FD.useDebounceImmediately();
  const selected = FD.usePickFreshString(dataModelBindings?.simpleBinding);

  const { options, isFetching } = useGetOptions({
    ...node.item,
    node,
    metadata: {
      setValue: (metadata) => {
        saveValue('metadata', metadata);
      },
    },
    formData: {
      type: 'single',
      value: selected,
      setValue: (newValue) => saveValue('simpleBinding', newValue),
    },
    removeDuplicates: true,
  });

  const formattedOptions = useFormattedOptions(options);

  if (isFetching) {
    return <AltinnSpinner />;
  }

  return (
    <Select
      label={langAsString('general.choose')}
      hideLabel={true}
      inputId={id}
      onChange={(newValue) => saveValue('simpleBinding', newValue)}
      onBlur={debounce}
      value={selected}
      disabled={readOnly}
      error={!isValid}
      options={formattedOptions}
      aria-label={overrideDisplay?.renderedInTable ? langAsString(textResourceBindings?.title) : undefined}
    />
  );
}
