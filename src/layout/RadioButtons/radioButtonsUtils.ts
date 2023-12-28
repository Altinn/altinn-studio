import type React from 'react';

import { FD } from 'src/features/formData/FormDataWrite';
import { useGetOptions } from 'src/features/options/useGetOptions';
import type { IRadioButtonsContainerProps } from 'src/layout/RadioButtons/RadioButtonsContainerComponent';

export const useRadioButtons = ({ node }: IRadioButtonsContainerProps) => {
  const { dataModelBindings } = node.item;
  const selected = FD.usePickFreshString(dataModelBindings?.simpleBinding);
  const saveData = FD.useSetForBindings(dataModelBindings);

  const { options: calculatedOptions, isFetching: fetchingOptions } = useGetOptions({
    ...node.item,
    node,
    metadata: {
      setValue: (metadata) => {
        saveData('metadata', metadata);
      },
    },
    formData: {
      type: 'single',
      value: selected,
      setValue: (value) => saveData('simpleBinding', value),
    },
  });

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    saveData('simpleBinding', event.target.value);
  };

  const handleChangeRadioGroup = (value: string) => {
    saveData('simpleBinding', value);
  };

  return {
    handleChange,
    handleChangeRadioGroup,
    fetchingOptions,
    selected,
    calculatedOptions,
  };
};
