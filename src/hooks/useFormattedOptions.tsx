import React, { useMemo } from 'react';

import type { MultiSelectOption, SingleSelectOption } from '@digdir/design-system-react';

import { SelectOptionItem } from 'src/components/form/SelectOptionItem';
import { useLanguage } from 'src/hooks/useLanguage';
import type { IOption } from 'src/types';

export function useFormattedOptions(options: IOption[] | undefined, includeDeleteLabel?: false): SingleSelectOption[];
export function useFormattedOptions(options: IOption[] | undefined, includeDeleteLabel: true): MultiSelectOption[];
export function useFormattedOptions(options: IOption[] | undefined, includeDeleteLabel?: boolean) {
  const { langAsString } = useLanguage();
  const listHasDescription = options?.some((option) => option.description) || false;
  return useMemo(
    () =>
      options?.map((option) => {
        const label = langAsString(option.label ?? option.value);

        const formattedOption = {
          label,
          formattedLabel: (
            <SelectOptionItem
              option={option}
              listHasDescription={listHasDescription}
            />
          ),
          value: option.value,
        } as any;

        if (includeDeleteLabel) {
          formattedOption.deleteButtonLabel = `${langAsString('general.delete')} ${label}`;
        }

        return formattedOption;
      }) ?? [],
    [options, listHasDescription, includeDeleteLabel, langAsString],
  );
}
