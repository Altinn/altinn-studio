import React from 'react';
import { CustomProperties } from '@altinn/schema-editor/components/SchemaInspector/CustomProperties';
import { renderWithRedux } from '../../../test/renderWithRedux';
import { UiSchemaNode, UiSchemaNodes } from '@altinn/schema-model';
import { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import { act, screen } from '@testing-library/react';
import { SchemaState } from '@altinn/schema-editor/types';
import { textMock } from '../../../../../testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import { nodeMockBase } from '../../../test/uiSchemaMock';

const user = userEvent.setup();

// Test data:
const defaultPath = 'test-path';
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
const uiSchema: UiSchemaNodes = [node];
const defaultSchemaState: Partial<SchemaState> = {
  uiSchema,
  selectedDefinitionNodeId: defaultPath,
  selectedEditorTab: 'definitions',
};

describe('CustomProperties', () => {
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
    expect(screen.getAllByText(textMock('schema_editor.custom_props_unknown_format'))).toHaveLength(1);
  });

  it('Renders a "delete" button for each property', () => {
    render();
    const deleteButtons = screen.getAllByRole('button', { name: textMock('general.delete') });
    expect(deleteButtons).toHaveLength(Object.keys(customProperties).length);
  });

  it('Calls setCustomProperties with correct parameters when the delete button is clicked', async () => {
    const { store } = render();
    await user.click(screen.getAllByRole('button', { name: textMock('general.delete') })[0]);
    const actions = store.getActions();
    expect(actions).toHaveLength(1);
    const { type, payload: { path, properties } } = actions[0];
    expect(type).toEqual('schemaEditor/setCustomProperties');
    expect(path).toEqual(defaultPath);
    const expectedProperties = { ...customProperties };
    delete expectedProperties[Object.keys(customProperties)[0]];
    expect(properties).toEqual(expectedProperties);
  });

  it('Calls setCustomProperties with correct parameters when a string property is changed', async () => {
    const { store } = render();
    const newLetter = 'e';
    await act(() => user.type(screen.getByLabelText(stringPropKey), newLetter));
    const actions = store.getActions();
    expect(actions).toHaveLength(1);
    const { type, payload: { path, properties } } = actions[0];
    expect(type).toEqual('schemaEditor/setCustomProperties');
    expect(path).toEqual(defaultPath);
    expect(properties[stringPropKey]).toEqual(stringPropValue + newLetter);
  });

  it('Calls setCustomProperties with correct parameters when a number property is changed', async () => {
    const { store } = render();
    const newDigit = 4;
    await act(() => user.type(screen.getByLabelText(numberPropKey), newDigit.toString()));
    const actions = store.getActions();
    expect(actions).toHaveLength(1);
    const { type, payload: { path, properties } } = actions[0];
    expect(type).toEqual('schemaEditor/setCustomProperties');
    expect(path).toEqual(defaultPath);
    expect(properties[numberPropKey]).toEqual(numberPropValue * 10 + newDigit);
  });

  it('Calls setCustomProperties with correct parameters when a boolean property is changed from false to true', async () => {
    const { store } = render();
    await user.click(screen.getByLabelText(initiallyFalseBoolPropKey));
    const actions = store.getActions();
    expect(actions).toHaveLength(1);
    const { type, payload: { path, properties } } = actions[0];
    expect(type).toEqual('schemaEditor/setCustomProperties');
    expect(path).toEqual(defaultPath);
    expect(properties[initiallyFalseBoolPropKey]).toBe(true);
  });

  it('Calls setCustomProperties with correct parameters when a boolean property is changed from true to false', async () => {
    const { store } = render();
    await user.click(screen.getByLabelText(initiallyTrueBoolPropKey));
    const actions = store.getActions();
    expect(actions).toHaveLength(1);
    const { type, payload: { path, properties } } = actions[0];
    expect(type).toEqual('schemaEditor/setCustomProperties');
    expect(path).toEqual(defaultPath);
    expect(properties[initiallyTrueBoolPropKey]).toBe(false);
  });
});

const render = (path: string = defaultPath, schemaState: Partial<SchemaState> = {}) =>
  renderWithRedux(
    <CustomProperties path={path}/>,
    { ...defaultSchemaState, ...schemaState }
  );
