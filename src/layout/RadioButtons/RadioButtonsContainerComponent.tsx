import React from 'react';

import { ControlledRadioGroup } from 'src/layout/RadioButtons/ControlledRadioGroup';
import { useRadioButtons } from 'src/layout/RadioButtons/radioButtonsUtils';
import type { PropsFromGenericComponent } from 'src/layout';

export type IRadioButtonsContainerProps = PropsFromGenericComponent<'RadioButtons' | 'Likert'>;

export const RadioButtonContainerComponent = (props: IRadioButtonsContainerProps) => {
  const useRadioProps = useRadioButtons(props);
  return (
    <ControlledRadioGroup
      {...props}
      {...useRadioProps}
    />
  );
};
