import React from 'react';

import { ControlledRadioGroup } from 'src/layout/RadioButtons/ControlledRadioGroup';
import { useRadioButtons } from 'src/layout/RadioButtons/radioButtonsUtils';
import type { PropsFromGenericComponent } from 'src/layout';

export interface IRadioButtonsContainerProps extends PropsFromGenericComponent<'RadioButtons'> {
  validationMessages?: any;
}

export const RadioButtonContainerComponent = (props: IRadioButtonsContainerProps) => {
  const useRadioProps = useRadioButtons(props);
  return (
    <ControlledRadioGroup
      {...props}
      {...useRadioProps}
    />
  );
};
