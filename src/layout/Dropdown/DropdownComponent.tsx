import React from 'react';

import { Select } from '@digdir/design-system-react';
import type { SingleSelectOption } from '@digdir/design-system-react';

import { AltinnSpinner } from 'src/components/AltinnSpinner';
import { useGetOptions } from 'src/features/options/useGetOptions';
import { useDelayedSavedState } from 'src/hooks/useDelayedSavedState';
import { useFormattedOptions } from 'src/hooks/useFormattedOptions';
import { useLanguage } from 'src/hooks/useLanguage';
import type { PropsFromGenericComponent } from 'src/layout';

type SortOrder = 'asc' | 'desc';
const compareSelectOptionAlphabetically =
  (sortOrder: SortOrder = 'asc') =>
  (a: SingleSelectOption, b: SingleSelectOption) => {
    const comparison = new Intl.Collator(['nb', 'en']).compare(a.label, b.label);
    return sortOrder === 'asc' ? comparison : -comparison;
  };

export type IDropdownProps = PropsFromGenericComponent<'Dropdown'>;
export function DropdownComponent({ node, formData, handleDataChange, isValid, overrideDisplay }: IDropdownProps) {
  const { id, readOnly, textResourceBindings, sortOrder } = node.item;
  const { langAsString } = useLanguage();
  const { value: selected, setValue, saveValue } = useDelayedSavedState(handleDataChange, formData?.simpleBinding, 200);

  const { options, isFetching } = useGetOptions({
    ...node.item,
    node,
    formData: {
      type: 'single',
      value: selected,
      setValue,
    },
    removeDuplicates: true,
  });

  const formattedOptions = useFormattedOptions(options);

  return (
    <>
      {isFetching ? (
        <AltinnSpinner />
      ) : (
        <Select
          label={langAsString('general.choose')}
          hideLabel={true}
          inputId={id}
          onChange={setValue}
          onBlur={saveValue}
          value={selected}
          disabled={readOnly}
          error={!isValid}
          options={
            sortOrder ? formattedOptions.toSorted(compareSelectOptionAlphabetically(sortOrder)) : formattedOptions
          }
          aria-label={overrideDisplay?.renderedInTable ? langAsString(textResourceBindings?.title) : undefined}
        />
      )}
    </>
  );
}
