import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithRedux } from '../../../test/renderWithRedux';
import { IReferenceSelectionProps, ReferenceSelectionComponent } from './ReferenceSelectionComponent';
import { createNodeBase, Keywords, ObjectKind, UiSchemaNode, UiSchemaNodes } from '@altinn/schema-model';
import userEvent from '@testing-library/user-event';

const user = userEvent.setup();

// Test data:
const buttonText = 'Gå til type';
const emptyOptionLabel = 'Velg type';
const label = 'Refererer til';
const onChangeRef = jest.fn();
const onGoToDefButtonClick = jest.fn();
const selectedNode: UiSchemaNode = {
  ...createNodeBase(Keywords.Reference, 'test'),
  objectKind: ObjectKind.Reference,
  ref: '',
};
const type1Name = 'type1';
const type2Name = 'type2';
const type1 = createNodeBase(Keywords.Definitions, type1Name);
const type2 = createNodeBase(Keywords.Definitions, type2Name);
const rootNode = {
  ...createNodeBase('#'),
  children: [selectedNode, type1, type2].map((node) => node.pointer),
};
const uiSchema: UiSchemaNodes = [rootNode, selectedNode, type1, type2];

const defaultProps: IReferenceSelectionProps = {
  buttonText,
  emptyOptionLabel,
  label,
  onChangeRef,
  onGoToDefButtonClick,
  selectedNode,
};

const renderReferenceSelectionComponent = (props?: Partial<IReferenceSelectionProps>) =>
  renderWithRedux(<ReferenceSelectionComponent {...defaultProps} {...props} />, { uiSchema });

test('Select box appears', () => {
  renderReferenceSelectionComponent();
  expect(screen.getByRole('combobox')).toBeDefined();
});

test('Label text appears', () => {
  renderReferenceSelectionComponent();
  expect(screen.getByText(label)).toBeDefined();
});

test('"Go to type" button appears with given text', () => {
  renderReferenceSelectionComponent();
  expect(screen.getByRole('button')).toHaveTextContent(buttonText);
});

test('All types should appear as options', () => {
  renderReferenceSelectionComponent();
  expect(screen.queryAllByRole('option')).toHaveLength(3);
});

test('Type options should have correct values and labels', () => {
  renderReferenceSelectionComponent();
  expect(screen.getByRole('option', { name: type1Name })).toHaveValue(type1.pointer);
  expect(screen.getByRole('option', { name: type2Name })).toHaveValue(type2.pointer);
});

test('Empty option text appears', () => {
  renderReferenceSelectionComponent();
  expect(screen.getByText(emptyOptionLabel)).toBeDefined();
});

test('Empty option is selected by default', () => {
  renderReferenceSelectionComponent();
  expect(screen.getByRole('combobox')).toHaveValue('');
});

test('Referenced type is selected if given', () => {
  renderReferenceSelectionComponent({ selectedNode: { ...selectedNode, ref: type1.pointer } });
  expect(screen.getByRole('combobox')).toHaveValue(type1.pointer);
});

test('onChange handler is called with correct parameters when value changes', async () => {
  renderReferenceSelectionComponent();
  await user.selectOptions(screen.getByRole('combobox'), type1.pointer);
  expect(onChangeRef).toHaveBeenCalledTimes(1);
  expect(onChangeRef).toHaveBeenCalledWith(selectedNode.pointer, type1.pointer);
});

test('onGoToDefButtonClick handler is called when "go to type" button is clicked', async () => {
  renderReferenceSelectionComponent();
  await user.click(screen.getByText(buttonText));
  expect(onGoToDefButtonClick).toHaveBeenCalledTimes(1);
});
