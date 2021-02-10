/* tslint:disable:jsx-wrap-multiline */
import { mount } from 'enzyme';
import 'jest';
import * as React from 'react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { EditModalContent, EditModalContentComponent } from '../../../../components/config/EditModalContent';

describe('>>> containers/EditModalContent', () => {
  let mockComponent: any;
  let mockLanguage: any;
  let mockHandleComponentUpdate: () => any;
  let mockStore: any;

  beforeEach(() => {
    const createStore = configureStore();
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
      readOnly: false,
      required: false,
      textResourceBindings: {
        title: 'Input',
      },
      type: 'Input',
    };
    const initialState = {
      appData: {
        codeLists: {
          codeLists: [] as any,
          error: null as any,
          fetched: true,
          fetching: false,
        },
        languageState: {
          language: mockLanguage,
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
      formDesigner: {
        layout: {
          selectedLayout: 'FormLayout',
          layouts: {
            FormLayout: {
              components: {},
              containers: {},
            },
          },
        },
      },
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
    expect(mountedEditModalContent.find('input').length).toBe(6);
  });
  it('+++ should return header spesific content when type header', () => {
    mockComponent = {
      dataModelBindings: {},
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
    expect(mountedEditModalContent.find('input').length).toBe(3);
  });
  it('+++ should return file uploader spesific content when type file uploader', () => {
    mockComponent = {
      dataModelBindings: {},
      readOnly: false,
      required: false,
      textResourceBindings: {
        title: 'FileUpload',
      },
      type: 'FileUpload',
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
    expect(mountedEditModalContent.find('input').length).toBe(10);
  });
  it('+++ should update min/max number of files on change', () => {
    mockComponent = {
      dataModelBindings: {},
      readOnly: false,
      required: true,
      textResourceBindings: {
        title: 'FileUpload',
      },
      type: 'FileUpload',
    };
    const mountedEditModalContent = mount(
      <Provider store={mockStore}>
        <EditModalContentComponent
          component={mockComponent}
          language={mockLanguage}
          handleComponentUpdate={mockHandleComponentUpdate}
          classes={null}
          textResources={[]}
        />
      </Provider>,
    );
    const instance = mountedEditModalContent.childAt(0).instance() as EditModalContentComponent;
    const maxFilesInput = mountedEditModalContent.find('#modal-properties-maximum-files').first().find('input');
    const minFilesInput = mountedEditModalContent.find('#modal-properties-minimum-files').first().find('input');

    const spy = jest.spyOn(instance, 'handleNumberOfAttachmentsChange');
    maxFilesInput.simulate('change', { target: { value: '2' } });
    instance.forceUpdate();
    expect(spy).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith('max');
    expect(instance.state.component.required).toBe(true);

    minFilesInput.simulate('change', { target: { value: '0' } });
    instance.forceUpdate();
    expect(spy).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith('min');
    expect(instance.state.component.required).toBe(false);
  });
  it('+++ should return button spesific content when type button', () => {
    mockComponent = {
      dataModelBindings: {},
      readOnly: false,
      required: false,
      textResourceBindings: {
        title: 'Button',
      },
      type: 'Button',
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
    expect(mountedEditModalContent.find('input').length).toBe(3);
  });
});
