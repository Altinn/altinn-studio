import { StudioDialog as Root } from './StudioDialog';
import { StudioDialogBlock } from './StudioDialogBlock';

type StudioDialogComponent = typeof Root & {
  Block: typeof StudioDialogBlock;
};

const StudioDialog = Root as StudioDialogComponent;

StudioDialog.Block = StudioDialogBlock;

StudioDialog.Block.displayName = 'StudioDialog.Block';

export type { StudioDialogProps } from './StudioDialog';

export { StudioDialog };
