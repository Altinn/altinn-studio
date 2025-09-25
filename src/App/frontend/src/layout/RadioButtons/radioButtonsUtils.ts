import type React from 'react';

import { useGetOptions } from 'src/features/options/useGetOptions';
import type { PropsFromGenericComponent } from 'src/layout';

export const useRadioButtons = ({ baseComponentId }: PropsFromGenericComponent<'RadioButtons' | 'LikertItem'>) => {
  const {
    options: calculatedOptions,
    isFetching: fetchingOptions,
    setData,
    selectedValues,
  } = useGetOptions(baseComponentId, 'single');

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setData([event.target.value]);
  };

  const handleChangeRadioGroup = (value: string) => {
    setData([value]);
  };

  return {
    handleChange,
    handleChangeRadioGroup,
    fetchingOptions,
    selectedValues,
    calculatedOptions,
  };
};
