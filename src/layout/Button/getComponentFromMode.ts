import { GoToTaskButton } from 'src/layout/Button/GoToTaskButton';
import { InstantiationButton } from 'src/layout/InstantiationButton/InstantiationButton';
export type ButtonMode = 'submit' | 'save' | 'go-to-task' | 'instantiate';

const buttons = {
  'go-to-task': GoToTaskButton,
  instantiate: InstantiationButton,
};
export const getComponentFromMode = (mode: ButtonMode) => {
  return buttons[mode];
};
