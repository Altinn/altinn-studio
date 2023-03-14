import type React from 'react';

import { GoToTaskButton } from 'src/layout/Button/GoToTaskButton';
import { InstantiationButton } from 'src/layout/InstantiationButton/InstantiationButton';
import type { IButtonProvidedProps } from 'src/layout/Button/ButtonComponent';
import type { ButtonMode } from 'src/layout/Button/types';

const buttons: { [key in ButtonMode]: React.FC<React.PropsWithChildren<IButtonProvidedProps>> | null } = {
  save: null,
  submit: null,
  'go-to-task': GoToTaskButton,
  instantiate: InstantiationButton,
};

export const getComponentFromMode = (mode: ButtonMode) => buttons[mode];
