import type { CellTextfieldProps } from './CellTextfield';
import { CellTextfield } from './CellTextfield';
import type { CellNumberfieldProps } from './CellNumberfield';
import { CellNumberfield } from './CellNumberfield';
import type { CellTextareaProps } from './CellTextarea';
import { CellTextarea } from './CellTextarea';
import type { CellButtonProps } from './CellButton';
import { CellButton } from './CellButton';
import { Cell } from './Cell';
import type { CellCheckboxProps } from './CellCheckbox';
import { CellCheckbox } from './CellCheckbox';
import type { InputCellComponent } from '../types/InputCellComponent';
import type { CellTextResourceInputProps } from './CellTextResource';
import { CellTextResource } from './CellTextResource';
import type { CellBooleanToggleProps } from './CellBooleanToggle';
import { CellBooleanToggle } from './CellBooleanToggle';

type CellComponent = typeof Cell & {
  Textfield: InputCellComponent<CellTextfieldProps, HTMLInputElement>;
  Textarea: InputCellComponent<CellTextareaProps, HTMLTextAreaElement>;
  Numberfield: InputCellComponent<CellNumberfieldProps, HTMLInputElement>;
  BooleanToggle: InputCellComponent<CellBooleanToggleProps, HTMLDivElement>;
  Button: InputCellComponent<CellButtonProps, HTMLButtonElement>;
  Checkbox: InputCellComponent<CellCheckboxProps, HTMLInputElement>;
  TextResource: InputCellComponent<CellTextResourceInputProps, HTMLInputElement>;
};

export const StudioInputTableCell = Cell as CellComponent;

StudioInputTableCell.Textfield = new CellTextfield('StudioInputTable.Cell.Textfield').component();
StudioInputTableCell.Textarea = new CellTextarea('StudioInputTable.Cell.Textarea').component();
StudioInputTableCell.Numberfield = new CellNumberfield(
  'StudioInputTable.Cell.Numberfield',
).component();
StudioInputTableCell.BooleanToggle = new CellBooleanToggle(
  'StudioInputTable.Cell.BooleanToggle',
).component();
StudioInputTableCell.Button = new CellButton('StudioInputTable.Cell.Button').component();
StudioInputTableCell.Checkbox = new CellCheckbox('StudioInputTable.Cell.Checkbox').component();
StudioInputTableCell.TextResource = new CellTextResource(
  'StudioInputTable.Cell.TextResource',
).component();

StudioInputTableCell.displayName = 'StudioInputTable.Cell';
