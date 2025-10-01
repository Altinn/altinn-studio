import type React from 'react';

import { InstantiationButton } from 'src/layout/InstantiationButton/InstantiationButton';
import type { IButtonProvidedProps } from 'src/layout/Button/ButtonComponent';
import type { ButtonMode } from 'src/layout/Button/config.generated';

const buttons: { [key in ButtonMode]: React.FC<React.PropsWithChildren<IButtonProvidedProps>> | null } = {
  save: null,
  submit: null,
  instantiate: InstantiationButton,
};

export const getComponentFromMode = (mode: ButtonMode) => buttons[mode];
