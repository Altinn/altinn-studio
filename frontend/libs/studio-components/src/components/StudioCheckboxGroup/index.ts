import { StudioCheckboxGroup as Root } from './StudioCheckboxGroup';
import { StudioCheckboxGroupHeading } from './StudioCheckboxGroupHeading';
import { StudioCheckboxGroupItem } from './StudioCheckboxGroupItem';
import { StudioCheckboxGroupError } from './StudioCheckboxGroupError';
import { useStudioCheckboxGroup } from './useStudioCheckboxGroup';

type StudioCheckboxGroupComponent = typeof Root & {
  Heading: typeof StudioCheckboxGroupHeading;
  Item: typeof StudioCheckboxGroupItem;
  Error: typeof StudioCheckboxGroupError;
};

const StudioCheckboxGroup = Root as StudioCheckboxGroupComponent;

StudioCheckboxGroup.Heading = StudioCheckboxGroupHeading;
StudioCheckboxGroup.Item = StudioCheckboxGroupItem;
StudioCheckboxGroup.Error = StudioCheckboxGroupError;

export { StudioCheckboxGroup };
export { useStudioCheckboxGroup };
