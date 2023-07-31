import React, { useMemo } from 'react';

import { Select } from '@digdir/design-system-react';
import type { MultiSelectOption } from '@digdir/design-system-react';

import { SelectOptionItem } from 'src/components/form/SelectOptionItem';
import { useDelayedSavedState } from 'src/hooks/useDelayedSavedState';
import { useGetOptions } from 'src/hooks/useGetOptions';
import { useLanguage } from 'src/hooks/useLanguage';
import { duplicateOptionFilter } from 'src/utils/options';
import type { PropsFromGenericComponent } from 'src/layout';

export type IMultipleSelectProps = PropsFromGenericComponent<'MultipleSelect'>;

export function MultipleSelectComponent({
  node,
  handleDataChange,
  formData,
  isValid,
  overrideDisplay,
}: IMultipleSelectProps) {
  const { options, optionsId, mapping, source, id, readOnly, textResourceBindings } = node.item;
  const apiOptions = useGetOptions({ optionsId, mapping, source });
  const { value, setValue, saveValue } = useDelayedSavedState(handleDataChange, formData?.simpleBinding);
  const { langAsString } = useLanguage();

  const listHasDescription = (apiOptions || options)?.some((option) => option.description) || false;

  const calculatedOptions: MultiSelectOption[] = useMemo(
    () =>
      (apiOptions || options)?.filter(duplicateOptionFilter).map((option) => {
        const label = langAsString(option.label ?? option.value);

        return {
          label,
          formattedLabel: (
            <SelectOptionItem
              option={option}
              listHasDescription={listHasDescription}
            />
          ),
          value: option.value,
          deleteButtonLabel: `${langAsString('general.delete')} ${label}`,
        };
      }) || [],
    [apiOptions, langAsString, options, listHasDescription],
  );

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
      options={calculatedOptions}
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
