import type React from 'react';

import { useGetOptions } from 'src/features/options/useGetOptions';
import type { IRadioButtonsContainerProps } from 'src/layout/RadioButtons/RadioButtonsContainerComponent';

export const useRadioButtons = ({ node }: IRadioButtonsContainerProps) => {
  const {
    options: calculatedOptions,
    isFetching: fetchingOptions,
    setData,
    selectedValues,
  } = useGetOptions({
    ...node.item,
    valueType: 'single',
    node,
  });

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
