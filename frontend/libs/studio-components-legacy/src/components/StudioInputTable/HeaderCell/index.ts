import { HeaderCell } from './HeaderCell';
import { HeaderCellCheckbox } from './HeaderCellCheckbox';

type HeaderCellComponent = typeof HeaderCell & {
  Checkbox: typeof HeaderCellCheckbox;
};

export const StudioInputTableHeaderCell = HeaderCell as HeaderCellComponent;

StudioInputTableHeaderCell.Checkbox = HeaderCellCheckbox;

StudioInputTableHeaderCell.displayName = 'StudioInputTableHeaderCell.HeaderCell';
StudioInputTableHeaderCell.Checkbox.displayName = 'StudioInputTableHeaderCell.Checkbox';
