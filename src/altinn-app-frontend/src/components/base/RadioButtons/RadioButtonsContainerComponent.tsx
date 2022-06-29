import React from 'react';
import type { IComponentProps } from '../../index';
import type { IMapping, IOption, IOptionSource } from 'src/types';
import { useRadioButtons } from 'src/components/base/RadioButtons/radioButtonsUtils';
import { ControlledRadioGroup } from 'src/components/base/RadioButtons/ControlledRadioGroup';

export interface IRadioButtonsContainerProps extends IComponentProps {
  validationMessages?: any;
  options?: IOption[];
  optionsId?: string;
  preselectedOptionIndex: number;
  title: string;
  mapping?: IMapping;
  source?: IOptionSource;
}

export const RadioButtonContainerComponent = (
  props: IRadioButtonsContainerProps,
) => {
  const useRadioProps = useRadioButtons(props);
  return (
    <ControlledRadioGroup
      {...props}
      {...useRadioProps}
    />
  );
};
