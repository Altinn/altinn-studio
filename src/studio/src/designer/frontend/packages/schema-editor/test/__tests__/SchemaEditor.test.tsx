import React from 'react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { render } from '@testing-library/react';
import { unmountComponentAtNode } from 'react-dom';
import { act } from 'react-dom/test-utils';
import SchemaEditor from '../../src/components/schemaEditor';
import { dataMock } from '../../src/mockData';
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
  const rootPath = '#/definitions/RA-0678_M';
  mockUiSchema = buildUISchema(dataMock, '#/definitions/RA-0678_M');
  mockInitialState = {
    rootName: rootPath,
    saveSchemaUrl: '',
    schema: { properties: {}, definitions: {} },
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
  mockStore = createStore({
    ...mockInitialState,
    schema: dataMock,
    uiSchema: mockUiSchema,
  });

  act(() => {
    const utils = render(
      <Provider store={mockStore}>
        <SchemaEditor
          schema={dataMock}
          onSaveSchema={() => {}}
          rootItemId='#/properties/melding'
        />
      </Provider>,
    );
    expect(utils.findByTestId('schema-editor')).toBeTruthy();
    expect(utils.getByText('Save data model').innerHTML).toBeTruthy();
  });
});

test('renders schema editor with button to add root item when schema is empty', () => {
  mockStore = createStore(mockInitialState);

  act(() => {
    const utils = render(
      <Provider store={mockStore}>
        <SchemaEditor
          schema={dataMock}
          onSaveSchema={() => {}}
          rootItemId='#/properties/melding'
        />
      </Provider>,
    );
    expect(utils.getByText('Add root item').innerHTML).toBeTruthy();
  });
});
