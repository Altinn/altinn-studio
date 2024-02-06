import React, { useMemo } from 'react';

import type { LegacyMultiSelectOption, LegacySingleSelectOption } from '@digdir/design-system-react';

import { SelectOptionItem } from 'src/components/form/SelectOptionItem';
import { useLanguage } from 'src/features/language/useLanguage';
import type { IOptionInternal } from 'src/features/options/castOptionsToStrings';

export function useFormattedOptions(
  options: IOptionInternal[] | undefined,
  includeDeleteLabel?: false,
): LegacySingleSelectOption[];
export function useFormattedOptions(
  options: IOptionInternal[] | undefined,
  includeDeleteLabel: true,
): LegacyMultiSelectOption[];
export function useFormattedOptions(options: IOptionInternal[] | undefined, includeDeleteLabel?: boolean) {
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
