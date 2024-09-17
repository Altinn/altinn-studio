import React from 'react';
import { screen } from '@testing-library/react';
import type { IReferenceSelectionProps } from './ReferenceSelectionComponent';
import { ReferenceSelectionComponent } from './ReferenceSelectionComponent';
import type { UiSchemaNode, UiSchemaNodes } from '@altinn/schema-model';
import {
  createNodeBase,
  Keyword,
  ObjectKind,
  SchemaModel,
  validateTestUiSchema,
} from '@altinn/schema-model';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test/renderWithProviders';

const user = userEvent.setup();

// Test data:
const buttonText = 'Gå til type';
const label = 'Refererer til';
const onChangeRef = jest.fn();
const onGoToDefButtonClick = jest.fn();
const type1Name = 'type1';
const type2Name = 'type2';
const type1 = createNodeBase(Keyword.Definitions, type1Name);
const type2 = createNodeBase(Keyword.Definitions, type2Name);
const selectedNode: UiSchemaNode = {
  ...createNodeBase(Keyword.Reference, 'test'),
  objectKind: ObjectKind.Reference,
  reference: type1.schemaPointer,
};
const rootNode = {
  ...createNodeBase('#'),
  children: [selectedNode, type1, type2].map((node) => node.schemaPointer),
};
const uiSchema: UiSchemaNodes = [rootNode, selectedNode, type1, type2];
const schemaModel = SchemaModel.fromArray(uiSchema);

const defaultProps: IReferenceSelectionProps = {
  buttonText,
  label,
  onChangeRef,
  onGoToDefButtonClick,
  selectedNode,
};

const renderReferenceSelectionComponent = (props?: Partial<IReferenceSelectionProps>) =>
  renderWithProviders({
    appContextProps: { schemaModel },
  })(<ReferenceSelectionComponent {...defaultProps} {...props} />);

describe('ReferenceSelectionComponent', () => {
  beforeAll(() => validateTestUiSchema(uiSchema));

  test('Select box appears', async () => {
    renderReferenceSelectionComponent();
    expect(await screen.findByRole('combobox')).toBeDefined();
  });

  test('Label text appears', async () => {
    renderReferenceSelectionComponent();
    expect(await screen.findByText(label)).toBeDefined();
  });

  test('"Go to type" button appears with given text', async () => {
    renderReferenceSelectionComponent();
    expect(await screen.findByRole('button', { name: buttonText })).toBeInTheDocument();
  });

  test('All types should appear as options', async () => {
    renderReferenceSelectionComponent();
    await user.click(screen.getByRole('combobox'));
    expect(screen.queryAllByRole('option')).toHaveLength(2);
  });

  test('Type options should have correct values and labels', async () => {
    renderReferenceSelectionComponent();
    await user.click(screen.getByRole('combobox'));
    expect(screen.getByRole('option', { name: type1Name })).toHaveAttribute(
      'value',
      type1.schemaPointer,
    );
    expect(screen.getByRole('option', { name: type2Name })).toHaveAttribute(
      'value',
      type2.schemaPointer,
    );
  });

  test('Referenced type is selected', async () => {
    renderReferenceSelectionComponent({
      selectedNode: { ...selectedNode, reference: type1.schemaPointer },
    });
    expect(await screen.findByRole('combobox')).toHaveValue(type1.schemaPointer);
  });

  test('onChange handler is called with correct parameters when value changes', async () => {
    renderReferenceSelectionComponent();
    await user.selectOptions(screen.getByRole('combobox'), type1.schemaPointer);
    expect(onChangeRef).toHaveBeenCalledTimes(1);
    expect(onChangeRef).toHaveBeenCalledWith(selectedNode.schemaPointer, type1.schemaPointer);
  });

  test('onGoToDefButtonClick handler is called when "go to type" button is clicked', async () => {
    renderReferenceSelectionComponent();
    await user.click(screen.getByText(buttonText));
    expect(onGoToDefButtonClick).toHaveBeenCalledTimes(1);
  });
});
