import React from 'react';

import { InputComponent } from 'nextsrc/core/layoutComponents/Input/InputComponent';
import {
  isRepeatingGroup,
  RepeatingGroupNext,
} from 'nextsrc/core/layoutComponents/RepeatingGroup/RepeatingGroupComponent';
import type { ResolvedCompExternal } from 'nextsrc/libs/form-client/moveChildren';

export function getLayoutComponent(componentProps: ResolvedCompExternal) {
  switch (componentProps.type) {
    case 'Input':
      return <InputComponent {...componentProps} />; // Validate configuration here?
    case 'RepeatingGroup':
      if (isRepeatingGroup(componentProps)) {
        return <RepeatingGroupNext {...componentProps} />;
      }
      return null; // Throw validation error?
    default:
      return null;
  }
}
