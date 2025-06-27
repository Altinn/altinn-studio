import type React from 'react';

import { useGetOptions } from 'src/features/options/useGetOptions';
import type { IControlledRadioGroupProps } from 'src/layout/RadioButtons/ControlledRadioGroup';

export const useRadioButtons = ({ node }: IControlledRadioGroupProps) => {
  const {
    options: calculatedOptions,
    isFetching: fetchingOptions,
    setData,
    selectedValues,
  } = useGetOptions(node.baseId, 'single');

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
