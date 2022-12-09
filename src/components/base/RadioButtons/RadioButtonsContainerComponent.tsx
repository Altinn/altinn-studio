import React from 'react';

import { ControlledRadioGroup } from 'src/components/base/RadioButtons/ControlledRadioGroup';
import { useRadioButtons } from 'src/components/base/RadioButtons/radioButtonsUtils';
import type { PropsFromGenericComponent } from 'src/components';

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
