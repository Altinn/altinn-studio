import type { ILayoutCompBase } from 'src/layout/layout';
import type { IActionType } from 'src/types/shared';

export interface ILayoutCompActionButton extends ILayoutCompBase<'ActionButton'> {
  action: IActionType;
  buttonStyle: ActionButtonStyle;
}

export type ActionButtonStyle = 'primary' | 'secondary';
