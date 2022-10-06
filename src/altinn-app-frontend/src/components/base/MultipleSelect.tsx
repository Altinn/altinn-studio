import React from 'react';
import Select from 'react-select';
import type { MultiValue } from 'react-select';

import type { IComponentProps } from '..';

import { useAppSelector } from 'src/common/hooks';
import { useGetOptions } from 'src/components/hooks';
import type { ILayoutCompMultipleSelect } from 'src/features/form/layout';
import type { IOption } from 'src/types';

import { getLanguageFromKey } from 'altinn-shared/utils';

import 'src/components/base/MultipleSelect.css';

const multipleSelectCssPrefix = 'multipleSelect';
const invalidBorderColor = '#D5203B !important';

export type IMultipleSelectProps = IComponentProps &
  Omit<ILayoutCompMultipleSelect, 'type'>;

export function MultipleSelect({
  options,
  optionsId,
  mapping,
  source,
  handleDataChange,
  getTextResourceAsString,
  formData,
  id,
  readOnly,
  isValid,
}: IMultipleSelectProps) {
  const apiOptions = useGetOptions({ optionsId, mapping, source });
  const calculatedOptions =
    (apiOptions || options)?.map((option) => ({
      label: getTextResourceAsString(option.label),
      value: option.value,
    })) || [];
  const language = useAppSelector((state) => state.language.language);

  const handleChange = (newValue: MultiValue<IOption>) => {
    handleDataChange(newValue.map((option) => option.value).join(','));
  };

  return (
    <Select
      options={calculatedOptions}
      isMulti
      inputId={id}
      isDisabled={readOnly}
      noOptionsMessage={() => {
        return getLanguageFromKey(
          'multiple_select_component.no_options',
          language,
        );
      }}
      placeholder={getLanguageFromKey(
        'multiple_select_component.placeholder',
        language,
      )}
      classNamePrefix={multipleSelectCssPrefix}
      className={multipleSelectCssPrefix}
      styles={{
        control: (base) => ({
          ...base,
          ...controlStylesHasError(!isValid),
        }),
      }}
      onChange={handleChange}
      value={calculatedOptions?.filter((option) =>
        formData?.simpleBinding?.split(',').includes(option.value),
      )}
    />
  );
}

const controlStylesHasError = (hasError) =>
  hasError ? { borderColor: invalidBorderColor } : {};
