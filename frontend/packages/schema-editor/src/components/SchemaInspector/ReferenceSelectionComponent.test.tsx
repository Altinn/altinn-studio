import React from 'react';
import { act, screen } from '@testing-library/react';
import type { IReferenceSelectionProps } from './ReferenceSelectionComponent';
import { ReferenceSelectionComponent } from './ReferenceSelectionComponent';
import type { UiSchemaNode, UiSchemaNodes } from '@altinn/schema-model';
import { createNodeBase, Keyword, ObjectKind } from '@altinn/schema-model';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { queryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { validateTestUiSchema } from '../../../../schema-model/test/validateTestUiSchema';

const user = userEvent.setup();

// Test data:
const buttonText = 'Gå til type';
const emptyOptionLabel = 'Velg type';
const label = 'Refererer til';
const onChangeRef = jest.fn();
const onGoToDefButtonClick = jest.fn();
const selectedNode: UiSchemaNode = {
  ...createNodeBase(Keyword.Reference, 'test'),
  objectKind: ObjectKind.Reference,
  reference: '',
};
const type1Name = 'type1';
const type2Name = 'type2';
const type1 = createNodeBase(Keyword.Definitions, type1Name);
const type2 = createNodeBase(Keyword.Definitions, type2Name);
const rootNode = {
  ...createNodeBase('#'),
  children: [selectedNode, type1, type2].map((node) => node.pointer),
};
const uiSchema: UiSchemaNodes = [rootNode, selectedNode, type1, type2];
const org = 'org';
const app = 'app';
const modelPath = 'test';

const defaultProps: IReferenceSelectionProps = {
  buttonText,
  emptyOptionLabel,
  label,
  onChangeRef,
  onGoToDefButtonClick,
  selectedNode,
};

const renderReferenceSelectionComponent = (props?: Partial<IReferenceSelectionProps>) => {
  queryClientMock.setQueryData([QueryKey.Datamodel, org, app, modelPath], uiSchema);
  return renderWithProviders({
    appContextProps: { modelPath },
  })(<ReferenceSelectionComponent {...defaultProps} {...props} />);
};

describe('ReferenceSelectionComponent', () => {
  beforeEach(() => validateTestUiSchema(uiSchema));

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
    await act(() => user.click(screen.getByRole('combobox')));
    expect(screen.queryAllByRole('option')).toHaveLength(3);
  });

  test('Type options should have correct values and labels', async () => {
    renderReferenceSelectionComponent();
    await act(() => user.click(screen.getByRole('combobox')));
    expect(screen.getByRole('option', { name: type1Name })).toHaveAttribute('value', type1.pointer);
    expect(screen.getByRole('option', { name: type2Name })).toHaveAttribute('value', type2.pointer);
  });

  test('Empty option text appears', async () => {
    renderReferenceSelectionComponent();
    await act(() => user.click(screen.getByRole('combobox')));
    expect(screen.getByRole('option', { name: emptyOptionLabel })).toBeDefined();
  });

  test('Empty option is selected by default', async () => {
    renderReferenceSelectionComponent();
    expect(await screen.findByRole('combobox')).toHaveValue(emptyOptionLabel);
  });

  test('Referenced type is selected if given', async () => {
    renderReferenceSelectionComponent({
      selectedNode: { ...selectedNode, reference: type1.pointer },
    });
    expect(await screen.findByRole('combobox')).toHaveValue(type1Name);
  });

  test('onChange handler is called with correct parameters when value changes', async () => {
    renderReferenceSelectionComponent();
    await act(() => user.click(screen.getByRole('combobox')));
    await act(() => user.click(screen.getByRole('option', { name: type1Name })));
    expect(onChangeRef).toHaveBeenCalledTimes(1);
    expect(onChangeRef).toHaveBeenCalledWith(selectedNode.pointer, type1.pointer);
  });

  test('onGoToDefButtonClick handler is called when "go to type" button is clicked', async () => {
    renderReferenceSelectionComponent();
    await act(() => user.click(screen.getByText(buttonText)));
    expect(onGoToDefButtonClick).toHaveBeenCalledTimes(1);
  });
});
