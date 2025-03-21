import { StudioModalRoot } from './StudioModalRoot';
import type { StudioModalRootProps } from './StudioModalRoot';
import { StudioModalDialog } from './StudioModalDialog';
import type { StudioModalDialogProps } from './StudioModalDialog';
import { StudioModalTrigger } from './StudioModalTrigger';
import type { StudioModalTriggerProps } from './StudioModalTrigger';

type StudioModalComponent = {
  Root: typeof StudioModalRoot;
  Dialog: typeof StudioModalDialog;
  Trigger: typeof StudioModalTrigger;
};

export const StudioModal: StudioModalComponent = {
  Root: StudioModalRoot,
  Dialog: StudioModalDialog,
  Trigger: StudioModalTrigger,
};

export type { StudioModalRootProps, StudioModalDialogProps, StudioModalTriggerProps };
