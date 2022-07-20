import React from 'react';

import { ControlledRadioGroup } from 'src/components/base/RadioButtons/ControlledRadioGroup';
import { useRadioButtons } from 'src/components/base/RadioButtons/radioButtonsUtils';
import type { IComponentProps } from 'src/components';
import type { ILayoutCompRadioButtons } from 'src/features/form/layout';

export interface IRadioButtonsContainerProps
  extends IComponentProps,
    ILayoutCompRadioButtons {
  validationMessages?: any;
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
