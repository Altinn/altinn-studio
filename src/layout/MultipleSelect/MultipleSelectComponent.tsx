import React, { useMemo } from 'react';

import { Select } from '@digdir/design-system-react';
import type { MultiSelectOption } from '@digdir/design-system-react';

import { useDelayedSavedState } from 'src/hooks/useDelayedSavedState';
import { useGetOptions } from 'src/hooks/useGetOptions';
import { useLanguage } from 'src/hooks/useLanguage';
import { duplicateOptionFilter, formatLabelForSelect } from 'src/utils/options';
import type { PropsFromGenericComponent } from 'src/layout';

import 'src/layout/MultipleSelect/MultipleSelect.css';

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

  const calculatedOptions: MultiSelectOption[] = useMemo(
    () =>
      (apiOptions || options)?.filter(duplicateOptionFilter).map((option) => {
        const label = langAsString(option.label ?? option.value);
        return {
          label,
          formattedLabel: formatLabelForSelect(option, langAsString),
          value: option.value,
          deleteButtonLabel: `${langAsString('general.delete')} ${label}`,
        };
      }) || [],
    [apiOptions, langAsString, options],
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
