import React from 'react';
import { CustomProperties } from '@altinn/schema-editor/components/SchemaInspector/CustomProperties';
import type { UiSchemaNode, UiSchemaNodes } from '@altinn/schema-model';
import { FieldType, ROOT_POINTER, SchemaModel } from '@altinn/schema-model';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import { act, screen } from '@testing-library/react';
import { textMock } from '../../../../../testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import { nodeMockBase } from '../../../test/mocks/uiSchemaMock';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { getSavedModel } from '../../../test/test-utils';
import { validateTestUiSchema } from '../../../../schema-model';

const user = userEvent.setup();

// Test data:
const defaultPath = '#/properties/test-path';
const stringPropKey = 'someStringProp';
const numberPropKey = 'someNumberProp';
const initiallyTrueBoolPropKey = 'someInitiallyTrueBoolProp';
const initiallyFalseBoolPropKey = 'someInitiallyFalseBoolProp';
const unsupportedPropKey = 'someUnsupportedProp';
const stringPropValue = 'test';
const numberPropValue = 123;
const unsupportedPropValue = {};
const customProperties: KeyValuePairs = {
  [stringPropKey]: stringPropValue,
  [numberPropKey]: numberPropValue,
  [initiallyTrueBoolPropKey]: true,
  [initiallyFalseBoolPropKey]: false,
  [unsupportedPropKey]: unsupportedPropValue,
};
const node: UiSchemaNode = {
  ...nodeMockBase,
  pointer: defaultPath,
  custom: customProperties,
};
const rootNode: UiSchemaNode = {
  ...nodeMockBase,
  fieldType: FieldType.Object,
  pointer: ROOT_POINTER,
  children: [defaultPath],
};
const uiSchema: UiSchemaNodes = [rootNode, node];
const schemaModel = SchemaModel.fromArray(uiSchema);
const saveDatamodel = jest.fn();

describe('CustomProperties', () => {
  beforeAll(() => validateTestUiSchema(uiSchema));
  afterEach(jest.clearAllMocks);

  it('Renders a list of all custom properties', () => {
    render();
    Object.keys(customProperties).forEach((key) => {
      expect(screen.getByText(key)).toBeInTheDocument();
    });
  });

  it('Renders legend', () => {
    render();
    expect(screen.getByText(textMock('schema_editor.custom_props'))).toBeInTheDocument();
  });

  it('Renders a text input with correct value for string properties', () => {
    render();
    expect(screen.getByLabelText(stringPropKey)).toHaveValue(stringPropValue);
  });

  it('Renders a number input with correct value for number properties', () => {
    render();
    expect(screen.getByLabelText(numberPropKey)).toHaveValue(numberPropValue.toString());
  });

  it('Renders a checkbox with correct value for boolean properties', () => {
    render();
    expect(screen.getByLabelText(initiallyTrueBoolPropKey)).toBeChecked();
    expect(screen.getByLabelText(initiallyFalseBoolPropKey)).not.toBeChecked();
  });

  it('Renders an "unsupported property" message for unsupported properties', () => {
    render();
    expect(screen.getAllByText(textMock('schema_editor.custom_props_unknown_format'))).toHaveLength(
      1,
    );
  });

  it('Renders a "delete" button for each property', () => {
    render();
    const deleteButtons = screen.getAllByRole('button', { name: textMock('general.delete') });
    expect(deleteButtons).toHaveLength(Object.keys(customProperties).length);
  });

  it('Saves model without deleted property when the delete button is clicked', async () => {
    render();
    await act(() =>
      user.click(screen.getAllByRole('button', { name: textMock('general.delete') })[0]),
    );
    expect(saveDatamodel).toHaveBeenCalledTimes(1);
    const updatedModel = getSavedModel(saveDatamodel);
    const updatedNode = updatedModel.getNode(defaultPath);
    const expectedProperties = { ...customProperties };
    delete expectedProperties[Object.keys(customProperties)[0]];
    expect(updatedNode.custom).toEqual(expectedProperties);
  });

  it('Saves model correctly when a string property is changed', async () => {
    render();
    const newLetter = 'e';
    await act(() => user.type(screen.getByLabelText(stringPropKey), newLetter));
    expect(saveDatamodel).toHaveBeenCalledTimes(1);
    const updatedModel = getSavedModel(saveDatamodel);
    const updatedNode = updatedModel.getNode(defaultPath);
    expect(updatedNode.custom[stringPropKey]).toEqual(stringPropValue + newLetter);
  });

  it('Saves model correctly when a number property is changed', async () => {
    render();
    const newDigit = 4;
    await act(() => user.type(screen.getByLabelText(numberPropKey), newDigit.toString()));
    expect(saveDatamodel).toHaveBeenCalledTimes(1);
    const updatedModel = getSavedModel(saveDatamodel);
    const updatedNode = updatedModel.getNode(defaultPath);
    expect(updatedNode.custom[numberPropKey]).toEqual(numberPropValue * 10 + newDigit);
  });

  it('Saves model correctly when a boolean property is changed from false to true', async () => {
    render();
    await act(() => user.click(screen.getByLabelText(initiallyFalseBoolPropKey)));
    expect(saveDatamodel).toHaveBeenCalledTimes(1);
    const updatedModel = getSavedModel(saveDatamodel);
    const updatedNode = updatedModel.getNode(defaultPath);
    expect(updatedNode.custom[initiallyFalseBoolPropKey]).toBe(true);
  });

  it('Saves model correctly when a boolean property is changed from true to false', async () => {
    render();
    await act(() => user.click(screen.getByLabelText(initiallyTrueBoolPropKey)));
    expect(saveDatamodel).toHaveBeenCalledTimes(1);
    const updatedModel = getSavedModel(saveDatamodel);
    const updatedNode = updatedModel.getNode(defaultPath);
    expect(updatedNode.custom[initiallyTrueBoolPropKey]).toBe(false);
  });
});

const render = (path: string = defaultPath) =>
  renderWithProviders({
    appContextProps: {
      schemaModel,
      save: saveDatamodel,
      selectedNodePointer: path,
    },
  })(<CustomProperties path={path} />);
