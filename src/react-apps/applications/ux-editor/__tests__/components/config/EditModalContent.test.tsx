/* tslint:disable:jsx-wrap-multiline */
import { mount } from 'enzyme';
import 'jest';
import * as React from 'react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { EditModalContent } from '../../../src/components/config/EditModalContent';

describe('>>> containers/EditModalContent', () => {
  let mockComponent: any;
  let mockLanguage: any;
  let mockHandleComponentUpdate: () => any;
  let mockStore: any;

  beforeEach(() => {
    const createStore = configureStore();
    const initialState = {
      appData: {
        codeLists: {
          codeLists: [] as any,
          error: null as any,
          fetched: true,
          fetching: false,
        },
        language: {
          language: {},
        },
        dataModel: {
          model: [] as any[],
        },
        textResources: {
          resources: [{ id: 'ServiceName', value: 'Test' }],
        },
      },
      thirdPartyComponents: {
        components: null as any,
        error: null as any,
      },
    };

    mockLanguage = {
      general: {
        label: '',
        value: '',
      },
      ux_editor: {
        modal_header_type_h2: 'H2',
        modal_header_type_h3: 'H3',
        modal_header_type_h4: 'H4',
      },
    };
    mockComponent = {
      dataModelBindings: {},
      itemType: 'COMPONENT',
      readOnly: false,
      required: false,
      textResourceBindings: {
        title: 'Input',
      },
      type: 'Input',
    };
    mockHandleComponentUpdate = () => {
      // something
    };
    mockStore = createStore(initialState);
  });

  it('+++ should return input spesific content when type input', () => {
    const mountedEditModalContent = mount(
      <Provider store={mockStore}>
        <EditModalContent
          component={mockComponent}
          language={mockLanguage}
          handleComponentUpdate={mockHandleComponentUpdate}
        />
      </Provider>,
    );
    expect(mountedEditModalContent.find('input').length).toBe(3);
  });
  it('+++ should return header spesific content when type header', () => {
    mockComponent = {
      dataModelBindings: {},
      itemType: 'COMPONENT',
      readOnly: false,
      required: false,
      textResourceBindings: {
        title: 'Header',
      },
      type: 'Header',
    };
    const mountedEditModalContent = mount(
      <Provider store={mockStore}>
        <EditModalContent
          component={mockComponent}
          language={mockLanguage}
          handleComponentUpdate={mockHandleComponentUpdate}
        />
      </Provider>,
    );
    expect(mountedEditModalContent.find('input').length).toBe(2);
  });
});
