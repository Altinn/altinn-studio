import {
  StudioPopover as StudioPopoverParent,
  StudioPopoverTrigger,
  StudioPopoverTriggerContext,
} from './StudioPopover';

import type { StudioPopoverTriggerProps } from './StudioPopover';

export const StudioPopover = Object.assign(StudioPopoverParent, {
  TriggerContext: StudioPopoverTriggerContext,
  Trigger: StudioPopoverTrigger,
});

export type { StudioPopoverTriggerProps };
