import { StudioDialog as Root } from './StudioDialog';
import { StudioDialogBlock } from './StudioDialogBlock';
import { StudioDialogTrigger } from './StudioDialogTrigger';
import { StudioDialogTriggerContext } from './StudioDialogTriggerContext';

type StudioDialogComponent = typeof Root & {
  Block: typeof StudioDialogBlock;
  Trigger: typeof StudioDialogTrigger;
  TriggerContext: typeof StudioDialogTriggerContext;
};

const StudioDialog = Root as StudioDialogComponent;

StudioDialog.Block = StudioDialogBlock;
StudioDialog.Trigger = StudioDialogTrigger;
StudioDialog.TriggerContext = StudioDialogTriggerContext;

StudioDialog.Block.displayName = 'StudioDialog.Block';
StudioDialog.Trigger.displayName = 'StudioDialog.Trigger';
StudioDialog.TriggerContext.displayName = 'StudioDialog.TriggerContext';

export type { StudioDialogProps } from './StudioDialog';
export { StudioDialog };
