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
        modal_properties_maximum_file_size_zero_error: 'Maks filstørrelse må være mer enn null',
        modal_properties_minimum_files_error: 'Minst antall filvedlegg kan ikke overskride maks antall filvedlegg',
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
      component: 'Input',
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
          classes={null}
        />
      </Provider>,
    );
    expect(mountedEditModalContent.find('input').length).toBe(3);
  });
  it('+++ should return header spesific content when component header', () => {
    mockComponent = {
      dataModelBindings: {},
      readOnly: false,
      required: false,
      textResourceBindings: {
        title: 'Header',
      },
      component: 'Header',
    };
    const mountedEditModalContent = mount(
      <Provider store={mockStore}>
        <EditModalContent
          component={mockComponent}
          language={mockLanguage}
          handleComponentUpdate={mockHandleComponentUpdate}
          classes={null}
        />
      </Provider>,
    );
    expect(mountedEditModalContent.find('input').length).toBe(2);
  });
  it('+++ should return file uploader spesific content when type file uploader', () => {
    mockComponent = {
      dataModelBindings: {},
      readOnly: false,
      required: false,
      textResourceBindings: {
        title: 'Header',
      },
      component: 'FileUpload',
    };
    const mountedEditModalContent = mount(
      <Provider store={mockStore}>
        <EditModalContent
          component={mockComponent}
          language={mockLanguage}
          handleComponentUpdate={mockHandleComponentUpdate}
          classes={null}
        />
      </Provider>,
    );
    expect(mountedEditModalContent.find('input').length).toBe(9);
  });
  it('+++ should return errors when type file uploader has invalid values', () => {
    mockComponent = {
      dataModelBindings: {},
      readOnly: false,
      required: false,
      textResourceBindings: {
        title: 'Header',
      },
      component: 'FileUpload',
      maxNumberOfAttachments: 1,
      minNumberOfAttachments: 2,
      maxFileSizeInMB: 0,
    };
    const mountedEditModalContent = mount(
      <Provider store={mockStore}>
        <EditModalContent
          component={mockComponent}
          language={mockLanguage}
          handleComponentUpdate={mockHandleComponentUpdate}
          classes={null}
        />
      </Provider>,
    );
    expect(mountedEditModalContent.find('p').first().contains
      ('Minst antall filvedlegg kan ikke overskride maks antall filvedlegg'));
    expect(mountedEditModalContent.find('.field-validation-error').contains('Maks filstørrelse må være mer enn null'));
  });
});
