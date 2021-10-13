import * as React from 'react';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import { mount, ReactWrapper } from 'enzyme';
import { act } from 'react-dom/test-utils';
import SchemaEditor from '../../src/components/Editor';
import { dataMock } from '../../src/mockData';
import { buildUISchema } from '../../src/utils';
import { ILanguage, ISchemaState, UiSchemaItem } from '../../src/types';
import reducer from '../../src/features/editor/schemaEditorSlice';

let mockStore: any = null;
let mockInitialState: ISchemaState;
let mockUiSchema: UiSchemaItem[];
let mockLanguage: ILanguage;

const mountComponent = () => mount(
  <Provider store={mockStore}>
    <SchemaEditor
      Toolbar={<div>toolbar goes here</div>}
      LoadingIndicator={<div>loading</div>}
      schema={dataMock}
      language={mockLanguage}
      onSaveSchema={() => { }}
      name='test'
    />
  </Provider>,
);

describe('>>> Editor.tsx', () => {
  beforeEach(() => {
    mockUiSchema = buildUISchema(dataMock.properties, '#/properties')
      .concat(buildUISchema(dataMock.definitions, '#/definitions'));

    mockInitialState = {
      name: 'test',
      saveSchemaUrl: '',
      schema: dataMock,
      uiSchema: mockUiSchema,
      selectedDefinitionNodeId: '',
      selectedPropertyNodeId: '',
      selectedEditorTab: 'properties',
    };
    mockLanguage = {
      schema_editor: {
        add: 'Legg til',
        add_element: 'Add Element',
        add_property: 'Legg til felt',
        add_reference: 'Legg til referanse',
        delete: 'Slett',
        field: 'Felt',
        reference: 'Referanse',
      },
    };
    mockStore = createStore(reducer, mockInitialState);
    mockStore.dispatch = jest.fn();
  });

  it('+++ renders schema editor with populated schema', () => {
    let wrapper: ReactWrapper = new ReactWrapper(<div />);
    act(() => {
      wrapper = mountComponent();
    });

    expect(wrapper.find('.schema-editor')).toBeTruthy();
    expect(wrapper.findWhere((n: ReactWrapper) => n.text().includes('Save data model'))).toBeTruthy();
  });

  const findTreeItems = (wrapper: ReactWrapper, text: string) => wrapper.find(
    '.MuiTypography-root',
  ).findWhere((r: ReactWrapper) => r.text() === text);

  it('+++ does not render properties on item click while in models view', () => {
    let wrapper: ReactWrapper = new ReactWrapper(<div />);
    act(() => {
      wrapper = mountComponent();
    });
    wrapper.find('.MuiTreeItem-iconContainer').hostNodes().at(0).simulate('click');
    expect(findTreeItems(wrapper, ' dataFormatProvider').length).toBe(0);
  });

  it('+++ should show context menu and trigger correct dispatch when adding a field on root', () => {
    const wrapper = mountComponent();
    wrapper.find('#add-button').hostNodes().simulate('click');
    wrapper.find('#add-field-button').hostNodes().simulate('click');
    expect(mockStore.dispatch).toBeCalledWith({
      type: 'schemaEditor/addRootItem',
      payload: {
        name: 'name',
        location: 'properties',
        type: '',
      },
    });
  });

  it('+++ should show context menu and trigger correct dispatch when adding a reference on root', () => {
    const wrapper = mountComponent();
    wrapper.find('#add-button').hostNodes().simulate('click');
    wrapper.find('#add-reference-button').hostNodes().simulate('click');
    expect(mockStore.dispatch).toBeCalledWith({
      type: 'schemaEditor/addRootItem',
      payload: {
        name: 'name',
        location: 'properties',
        $ref: '',
      },
    });
  });

  it('+++ should show context menu and trigger correct dispatch when adding field on a specific node', () => {
    const customState = {
      schema: { properties: { mockItem: { type: 'object' } }, definitions: {} },
      uiSchema: buildUISchema({ mockItem: { type: 'object' } }, '#/properties'),
    };
    mockStore = createStore(reducer,
      { ...mockInitialState,
        ...customState });
    mockStore.dispatch = jest.fn();
    const wrapper = mountComponent();
    wrapper.find('#open-context-menu-button').hostNodes().simulate('click');
    wrapper.find('#add-property-to-node-button').hostNodes().simulate('click');
    expect(mockStore.dispatch).toBeCalledWith({
      type: 'schemaEditor/addProperty',
      payload: {
        path: '#/properties/mockItem',
        type: '',
      },
    });
  });

  it('+++ should show context menu and trigger correct dispatch when adding reference on a specific node', () => {
    const customState = {
      schema: { properties: { mockItem: { type: 'object' } }, definitions: {} },
      uiSchema: buildUISchema({ mockItem: { type: 'object' } }, '#/properties'),
    };
    mockStore = createStore(reducer,
      { ...mockInitialState,
        ...customState });
    mockStore.dispatch = jest.fn();
    const wrapper = mountComponent();
    wrapper.find('#open-context-menu-button').hostNodes().simulate('click');
    wrapper.find('#add-reference-to-node-button').hostNodes().simulate('click');
    expect(mockStore.dispatch).toBeCalledWith({
      type: 'schemaEditor/addProperty',
      payload: {
        path: '#/properties/mockItem',
        $ref: '',
      },
    });
  });

  it('+++ should show context menu and trigger correct dispatch when deleting a specific node', () => {
    const wrapper = mountComponent();
    wrapper.find('#open-context-menu-button').hostNodes().simulate('click');
    wrapper.find('#delete-node-button').hostNodes().simulate('click');
    expect(mockStore.dispatch).toBeCalledWith({
      type: 'schemaEditor/deleteProperty',
      payload: {
        path: '#/properties/melding',
      },
    });
  });

  it('+++ should not show add property or add reference buttons on a reference node', () => {
    let mockProperties = {
      mockItem: { $ref: '#/definitions/mockDefinition' },
    };
    let mockDefinitions = {
      mockDefinition: { type: 'object' },
    };
    const customState = {
      schema: { properties: mockProperties, definitions: mockDefinitions},
      uiSchema: buildUISchema(mockProperties, '#/properties').concat(buildUISchema(mockDefinitions, '#/definitions')),
    };
    mockStore = createStore(reducer,
      { ...mockInitialState,
        ...customState });
    mockStore.dispatch = jest.fn();
    const wrapper = mountComponent();
    wrapper.find('#open-context-menu-button').hostNodes().simulate('click');
    expect(wrapper.contains('#add-property-to-node-button')).toBe(false);
    expect(wrapper.contains('#add-reference-to-node-button')).toBe(false);
  });
});
