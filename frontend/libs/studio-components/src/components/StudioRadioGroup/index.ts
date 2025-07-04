import { StudioRadioGroup as Root } from './StudioRadioGroup';
import { StudioRadioGroupHeading } from './StudioRadioGroupHeading';
import { StudioRadioGroupItem } from './StudioRadioGroupItem';
import { StudioRadioGroupError } from './StudioRadioGroupError';
import { useStudioRadioGroup } from './useStudioRadioGroup';

type StudioRadioGroupComponent = typeof Root & {
  Heading: typeof StudioRadioGroupHeading;
  Item: typeof StudioRadioGroupItem;
  Error: typeof StudioRadioGroupError;
};

const StudioRadioGroup = Root as StudioRadioGroupComponent;

StudioRadioGroup.Heading = StudioRadioGroupHeading;
StudioRadioGroup.Item = StudioRadioGroupItem;
StudioRadioGroup.Error = StudioRadioGroupError;

export { StudioRadioGroup };
export { useStudioRadioGroup };
