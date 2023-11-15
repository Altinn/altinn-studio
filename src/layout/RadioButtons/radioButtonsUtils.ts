import type React from 'react';

import { useGetOptions } from 'src/features/options/useGetOptions';
import { useDelayedSavedState } from 'src/hooks/useDelayedSavedState';
import type { IRadioButtonsContainerProps } from 'src/layout/RadioButtons/RadioButtonsContainerComponent';

export const useRadioButtons = ({ node, handleDataChange, formData }: IRadioButtonsContainerProps) => {
  const { dataModelBindings } = node.item;
  const {
    value: selected,
    setValue,
    saveValue,
  } = useDelayedSavedState(handleDataChange, dataModelBindings?.simpleBinding, formData?.simpleBinding ?? '', 200);
  const { options: calculatedOptions, isFetching: fetchingOptions } = useGetOptions({
    ...node.item,
    node,
    metadata: {
      setValue: (metadata) => {
        handleDataChange(metadata, { key: 'metadata' });
      },
    },
    formData: {
      type: 'single',
      value: selected,
      setValue: (value) => setValue(value, true),
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
