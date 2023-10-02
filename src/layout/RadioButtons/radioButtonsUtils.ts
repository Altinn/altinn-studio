import type React from 'react';

import { useGetOptions } from 'src/features/options/useGetOptions';
import { useDelayedSavedState } from 'src/hooks/useDelayedSavedState';
import type { IRadioButtonsContainerProps } from 'src/layout/RadioButtons/RadioButtonsContainerComponent';

export const useRadioButtons = ({ node, handleDataChange, formData }: IRadioButtonsContainerProps) => {
  const {
    value: selected,
    setValue,
    saveValue,
  } = useDelayedSavedState(handleDataChange, formData?.simpleBinding ?? '', 200);
  const { options: calculatedOptions, isFetching: fetchingOptions } = useGetOptions({
    ...node.item,
    node,
    formData: {
      type: 'single',
      value: selected,
      setValue,
    },
  });

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setValue(event.target.value);
  };

  const handleChangeRadioGroup = (value: string) => {
    setValue(value);
  };

  const handleBlur: React.FocusEventHandler = (event) => {
    // Only set value instantly if moving focus outside of the radio group
    if (!event.currentTarget.contains(event.relatedTarget)) {
      saveValue();
    }
  };
  return {
    handleChange,
    handleChangeRadioGroup,
    handleBlur,
    fetchingOptions,
    selected,
    calculatedOptions,
  };
};
