import type { CellTextResourceInputProps } from '../Cell/CellTextResource';
import type { TextResourceInputTexts } from '../../StudioTextResourceInput';
import { textResourcesMock } from '../../../test-data/textResourcesMock';

export const headerCheckboxLabel = 'Select all';
export const textHeader = 'Text';
export const textfieldHeader = 'Textfield';
export const numberfieldHeader = 'Numberfield';
export const textareaHeader = 'Textarea';
export const buttonHeader = 'Button';
export const textResourceHeader = 'Text Resource';
export const checkboxValue = (rowNumber: number) => `checkboxValue${rowNumber}`;
export const checkboxName = (rowNumber: number) => `checkboxName${rowNumber}`;
export const checkboxLabel = (rowNumber: number) => `Checkbox ${rowNumber}`;
export const cleanText = (rowNumber: number) => `Text ${rowNumber}`;
export const textfieldName = (rowNumber: number) => `textfield${rowNumber}`;
export const textfieldLabel = (rowNumber: number) => `Textfield ${rowNumber}`;
export const numberfieldName = (rowNumber: number) => `numberfield${rowNumber}`;
export const numberfieldLabel = (rowNumber: number) => `Numberfield ${rowNumber}`;
export const textareaName = (rowNumber: number) => `textarea${rowNumber}`;
export const textareaLabel = (rowNumber: number) => `Textarea ${rowNumber}`;
export const buttonLabel = (rowNumber: number) => `Button ${rowNumber}`;
export const textResourcePickerLabel = (rowNumber: number) => `Text resource ${rowNumber}`;
export const textResourceValueLabel = (rowNumber: number) => `Text value ${rowNumber}`;
export const textResourceEditLabel = (rowNumber: number) => `Edit text ${rowNumber}`;
export const textResourceSearchLabel = (rowNumber: number) => `Search for text ${rowNumber}`;

export const textResourceProps = (rowNumber: number): CellTextResourceInputProps => ({
  textResources: textResourcesMock,
  texts: textResourceTexts(rowNumber),
  currentId: 'land.NO',
  onChangeCurrentId: jest.fn(),
  onChangeTextResource: jest.fn(),
  onCreateTextResource: jest.fn(),
});

export const textResourceTexts = (rowNumber: number): TextResourceInputTexts => ({
  editValue: textResourceEditLabel(rowNumber),
  emptyTextResourceList: 'No text resources available',
  idLabel: 'ID:',
  search: textResourceSearchLabel(rowNumber),
  textResourcePickerLabel: textResourcePickerLabel(rowNumber),
  noTextResourceOptionLabel: 'Ikke oppgitt',
  valueLabel: textResourceValueLabel(rowNumber),
});
