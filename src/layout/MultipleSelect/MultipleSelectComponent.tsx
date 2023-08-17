import React from 'react';

import { Select } from '@digdir/design-system-react';

import { useDelayedSavedState } from 'src/hooks/useDelayedSavedState';
import { useFormattedOptions } from 'src/hooks/useFormattedOptions';
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
  const { options, optionsId, mapping, queryParameters, source, id, readOnly, textResourceBindings } = node.item;
  const apiOptions = useGetOptions({ optionsId, mapping, queryParameters, source });
  const { value, setValue, saveValue } = useDelayedSavedState(handleDataChange, formData?.simpleBinding);
  const { langAsString } = useLanguage();

  const calculatedOptions = (apiOptions || options)?.filter(duplicateOptionFilter);

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
