import type { CellTextfieldProps } from './CellTextfield';
import { CellTextfield } from './CellTextfield';
import type { CellTextareaProps } from './CellTextarea';
import { CellTextarea } from './CellTextarea';
import type { CellButtonProps } from './CellButton';
import { CellButton } from './CellButton';
import { Cell } from './Cell';
import type { CellCheckboxProps } from './CellCheckbox';
import { CellCheckbox } from './CellCheckbox';
import type { InputCellComponent } from '../types/InputCellComponent';

type CellComponent = typeof Cell & {
  Textfield: InputCellComponent<CellTextfieldProps, HTMLInputElement>;
  Textarea: InputCellComponent<CellTextareaProps, HTMLTextAreaElement>;
  Button: InputCellComponent<CellButtonProps, HTMLButtonElement>;
  Checkbox: InputCellComponent<CellCheckboxProps, HTMLInputElement>;
};

export const StudioInputTableCell = Cell as CellComponent;

StudioInputTableCell.Textfield = new CellTextfield('StudioInputTable.Cell.Textfield').component();
StudioInputTableCell.Textarea = new CellTextarea('StudioInputTable.Cell.Textarea').component();
StudioInputTableCell.Button = new CellButton('StudioInputTable.Cell.Button').component();
StudioInputTableCell.Checkbox = new CellCheckbox('StudioInputTable.Cell.Checkbox').component();

StudioInputTableCell.displayName = 'StudioInputTable.Cell';
