import { StudioPropertyGroup } from './StudioPropertyGroup';
import { StudioPropertyButton } from './StudioPropertyButton';
import { StudioPropertyFieldset } from './StudioPropertyFieldset';
import type { StudioPropertyGroupProps } from './StudioPropertyGroup';
import type { StudioPropertyButtonProps } from './StudioPropertyButton';
import type { StudioPropertyFieldsetProps } from './StudioPropertyFieldset';

type StudioPropertyComponent = {
  Group: typeof StudioPropertyGroup;
  Button: typeof StudioPropertyButton;
  Fieldset: typeof StudioPropertyFieldset;
};

export const StudioProperty: StudioPropertyComponent = {
  Group: StudioPropertyGroup,
  Button: StudioPropertyButton,
  Fieldset: StudioPropertyFieldset,
};

export type { StudioPropertyGroupProps, StudioPropertyButtonProps, StudioPropertyFieldsetProps };
