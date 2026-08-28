import type React from 'react';

import type { ButtonMode } from '@app/layout-contract/generated/components/Button/config.generated';

import { InstantiationButton } from 'src/layout/InstantiationButton/InstantiationButton';
import type { IButtonProvidedProps } from 'src/layout/Button/ButtonComponent';

const buttons: { [key in ButtonMode]: React.FC<React.PropsWithChildren<IButtonProvidedProps>> | null } = {
  save: null,
  submit: null,
  instantiate: InstantiationButton,
};

export const getComponentFromMode = (mode: ButtonMode) => buttons[mode];
