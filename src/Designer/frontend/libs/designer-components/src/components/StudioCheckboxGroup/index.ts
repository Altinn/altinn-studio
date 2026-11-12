import { StudioCheckboxGroup as Root } from './StudioCheckboxGroup';
import { StudioCheckboxGroupItem } from './StudioCheckboxGroupItem';
import { StudioCheckboxGroupError } from './StudioCheckboxGroupError';
import { useStudioCheckboxGroup } from './useStudioCheckboxGroup';

type StudioCheckboxGroupComponent = typeof Root & {
  Item: typeof StudioCheckboxGroupItem;
  Error: typeof StudioCheckboxGroupError;
};

const StudioCheckboxGroup = Root as StudioCheckboxGroupComponent;

StudioCheckboxGroup.Item = StudioCheckboxGroupItem;
StudioCheckboxGroup.Error = StudioCheckboxGroupError;

export { StudioCheckboxGroup };
export { useStudioCheckboxGroup };
