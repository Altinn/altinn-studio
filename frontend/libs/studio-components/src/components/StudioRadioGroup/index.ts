import { StudioRadioGroup as Root } from './StudioRadioGroup';
import { StudioRadioGroupItem } from './StudioRadioGroupItem';
import { StudioRadioGroupError } from './StudioRadioGroupError';
import { useStudioRadioGroup } from './useStudioRadioGroup';

type StudioRadioGroupComponent = typeof Root & {
  Item: typeof StudioRadioGroupItem;
  Error: typeof StudioRadioGroupError;
};

const StudioRadioGroup = Root as StudioRadioGroupComponent;

StudioRadioGroup.Item = StudioRadioGroupItem;
StudioRadioGroup.Error = StudioRadioGroupError;

export { StudioRadioGroup };
export { useStudioRadioGroup };
