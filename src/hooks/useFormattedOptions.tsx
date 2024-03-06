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
        const description = option.description && langAsString(option.description);

        const formattedOption = {
          label,
          formattedLabel: (
            <SelectOptionItem
              label={label}
              description={description}
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
    [options, langAsString, listHasDescription, includeDeleteLabel],
  );
}
