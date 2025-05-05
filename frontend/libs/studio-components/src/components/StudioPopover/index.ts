import {
  StudioPopover as StudioPopoverParent,
  StudioPopoverTrigger,
  StudioPopoverTriggerContext,
} from './StudioPopover';

export const StudioPopover = Object.assign(StudioPopoverParent, {
  TriggerContext: StudioPopoverTriggerContext,
  Trigger: StudioPopoverTrigger,
});
