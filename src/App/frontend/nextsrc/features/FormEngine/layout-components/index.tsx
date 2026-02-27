import React from 'react';
import type { ReactElement } from 'react';

import { ButtonComponent } from 'nextsrc/features/FormEngine/layout-components/Button/ButtonComponent';
import {
  ButtonGroupComponent,
  isButtonGroup,
} from 'nextsrc/features/FormEngine/layout-components/ButtonGroup/ButtonGroupComponent';
import { InputComponent } from 'nextsrc/features/FormEngine/layout-components/Input/InputComponent';
import {
  isRepeatingGroup,
  RepeatingGroupNext,
} from 'nextsrc/features/FormEngine/layout-components/RepeatingGroup/RepeatingGroupComponent';
import { ParagraphComponent } from 'nextsrc/features/FormEngine/Paragraph/ParagraphComponent';
import type { ResolvedCompExternal } from 'nextsrc/libs/form-client/moveChildren';

export function renderComponent(componentProps: ResolvedCompExternal): ReactElement | null {
  switch (componentProps.type) {
    case 'Input':
      return <InputComponent {...componentProps} />;
    case 'RepeatingGroup':
      if (isRepeatingGroup(componentProps)) {
        return <RepeatingGroupNext {...componentProps} />;
      }
      return null;
    case 'Paragraph': {
      return <ParagraphComponent {...componentProps} />;
    }
    case 'Button': {
      return <ButtonComponent {...componentProps} />;
    }
    case 'ButtonGroup': {
      if (isButtonGroup(componentProps)) {
        return <ButtonGroupComponent {...componentProps} />;
      }
      return null;
    }

    default:
      return null;
  }
}
