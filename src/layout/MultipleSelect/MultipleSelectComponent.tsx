import React from 'react';

import { Select } from '@digdir/design-system-react';
import type { MultiSelectOption } from '@digdir/design-system-react';

import { useAppSelector } from 'src/hooks/useAppSelector';
import { useDelayedSavedState } from 'src/hooks/useDelayedSavedState';
import { useGetOptions } from 'src/hooks/useGetOptions';
import { getLanguageFromKey } from 'src/language/sharedLanguage';
import { duplicateOptionFilter, formatLabelForSelect } from 'src/utils/options';
import type { PropsFromGenericComponent } from 'src/layout';

import 'src/layout/MultipleSelect/MultipleSelect.css';

export type IMultipleSelectProps = PropsFromGenericComponent<'MultipleSelect'>;

export function MultipleSelectComponent({
  node,
  handleDataChange,
  getTextResourceAsString,
  formData,
  isValid,
  overrideDisplay,
}: IMultipleSelectProps) {
  const { options, optionsId, mapping, source, id, readOnly, textResourceBindings } = node.item;
  const apiOptions = useGetOptions({ optionsId, mapping, source });
  const language = useAppSelector((state) => state.language.language);
  const { value, setValue, saveValue } = useDelayedSavedState(handleDataChange, formData?.simpleBinding);
  const textResources = useAppSelector((state) => state.textResources.resources);

  if (!language) {
    return null;
  }

  const calculatedOptions: MultiSelectOption[] =
    (apiOptions || options)?.filter(duplicateOptionFilter).map((option) => {
      const label = getTextResourceAsString(option.label) ?? option.value;
      return {
        label,
        formattedLabel: formatLabelForSelect(option, textResources),
        value: option.value,
        deleteButtonLabel: `${getLanguageFromKey('general.delete', language)} ${label}`,
      };
    }) || [];

  const handleChange = (values: string[]) => {
    setValue(values.join(','));
  };

  const selectedValues = calculatedOptions
    ?.filter((option) => value?.split(',').includes(option.value))
    .map((option) => option.value);

  return (
    <Select
      label={getLanguageFromKey('general.choose', language)}
      hideLabel={true}
      options={calculatedOptions}
      deleteButtonLabel={getLanguageFromKey('general.delete', language)}
      multiple
      inputId={id}
      disabled={readOnly}
      error={!isValid}
      onChange={handleChange}
      onBlur={saveValue}
      value={selectedValues}
      aria-label={overrideDisplay?.renderedInTable ? getTextResourceAsString(textResourceBindings?.title) : undefined}
    />
  );
}
