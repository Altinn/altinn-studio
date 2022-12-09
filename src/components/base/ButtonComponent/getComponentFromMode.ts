import { GoToTaskButton } from 'src/components/base/ButtonComponent/GoToTaskButton';
import { InstantiationButton } from 'src/components/base/ButtonComponent/InstantiationButton';
export type ButtonMode = 'submit' | 'save' | 'go-to-task' | 'instantiate';

const buttons = {
  'go-to-task': GoToTaskButton,
  instantiate: InstantiationButton,
};
export const getComponentFromMode = (mode: ButtonMode) => {
  return buttons[mode];
};
