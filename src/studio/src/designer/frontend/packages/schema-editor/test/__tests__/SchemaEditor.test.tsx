import React from 'react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { render } from '@testing-library/react';
import SchemaEditor from '../../src/components/schemaEditor';
import { dataMock } from '../../src/mockData';
import { unmountComponentAtNode } from 'react-dom';
import { act } from 'react-dom/test-utils';
import { buildUISchema } from '../../src/utils';
import { ISchemaState, UiSchemaItem } from '../../src/types';

let container: any = null;
let mockStore: any = null;
let mockInitialState: ISchemaState;
let createStore: any;
let mockUiSchema: UiSchemaItem[];

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  const rootPath = '#/definitions/RA_0678-M'
  mockUiSchema = buildUISchema(dataMock, '#/definitions/RA_0678-M');
  mockInitialState = {
    rootName: rootPath,
    saveSchemaUrl: '',
    schema: {},
    uiSchema: [],
  };
  createStore = configureStore();

});

afterEach(() => {
  unmountComponentAtNode(container);
  container.remove();
  container = null;
  mockStore = null;
});

test('renders schema editor with populated schema', () => {
  let utils: any = null;
  mockStore = createStore({
    ...mockInitialState,
    schema: dataMock,
    uiSchema: mockUiSchema,
  });
  act(() => {
    utils = render(
      <Provider store={mockStore}>
        <SchemaEditor
        schema={dataMock}
        onSaveSchema={() => {}}
        rootItemId='#/properties/melding'
      />
      </Provider>
    );
  });
  expect(utils.container.firstChild.getAttribute('id')).toBe('schema-editor');
  expect(utils.getByText('Save data model').innerHTML).toBeTruthy();
  // expect(utils.getByRole('button').innerHTML).toEqual('Add root item')
});

test('renders schema editor with button to add root item when schema is empty', () => {
  let utils: any = null;
  mockStore = createStore(mockInitialState);

  act(() => {
    utils = render(
      <Provider store={mockStore}>
        <SchemaEditor
        schema={dataMock}
        onSaveSchema={() => {}}
        rootItemId='#/properties/melding'
      />
      </Provider>
    );
    expect(utils.container.firstChild.getAttribute('id')).toBe('schema-editor');
    expect(utils.getByText('Add root item').innerHTML).toBeTruthy();
  })
})
