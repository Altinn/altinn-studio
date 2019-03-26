import { mount } from 'enzyme';
import 'jest';
import * as React from 'react';
import { Provider } from 'react-redux';
import * as renderer from 'react-test-renderer';
import configureStore from 'redux-mock-store';
import { FileUploadComponent, FileUploadComponentClass } from '../../../src/components/base/FileUploadComponent';

describe('>>> components/base/FileUploadComponent.tsx', () => {
  let mockId: string;
  let mockComponent: any;
  let mockIsValid: boolean;
  let mockStore: any;
  let mockInitialState: any;
  let mockAttachments: any[];
  let mockFileList: File[];

  beforeEach(() => {
    const createStore = configureStore();
    mockId = 'mockId';
    mockAttachments = [
      { name: 'attachment-name-1', id: 'attachment-id-1', size: '1200', uploaded: true, deleting: false },
      { name: 'attachment-name-2', id: 'attachment-id-2', size: '800', uploaded: false, deleting: false },
      { name: 'attachment-name-3', id: 'attachment-id-3', size: '400', uploaded: true, deleting: true },
    ];
    mockInitialState = {
      formFiller: {
        attachments: {
          mockId: mockAttachments,
        },
        validationResults: {
          mockId: {
            simpleBinding: {
              errors: ['mock error message'],
            },
          },
        },
      },
    };
    mockComponent = {
      id: mockId,
      component: 'FileUpload',
      maxNumberOfAttachments: 4,
      maxFileSizeInMB: 2,
      hasCustomFileEndings: false,
      displayMode: 'simple',
      textResourceBindings: {
        title: 'test-fileuploader',
      },
    };
    mockIsValid = true;
    mockFileList = [{ name: 'mock-name.txt', lastModified: null, size: 100, slice: null, type: null }];
    mockStore = createStore(mockInitialState);
  });

  it('+++ should match snapshot', () => {
    const rendered = renderer.create(
      <Provider store={mockStore}>
        <FileUploadComponent
          id={mockId}
          component={mockComponent}
          isValid={mockIsValid}
          language={{}}
        />
      </Provider>,
    );
    expect(rendered).toMatchSnapshot();
  });

  it('+++ should show spinner when file is uploading or deleting', () => {
    const wrapper = mount(
      <FileUploadComponentClass
        id={mockId}
        component={mockComponent}
        isValid={mockIsValid}
        language={{}}
        attachments={mockAttachments}
        validationMessages={mockInitialState.formFiller.validationResults.mockId}
      />,
    );
    expect(wrapper.find('#loader-upload')).toHaveLength(1);
    expect(wrapper.find('#loader-delete')).toHaveLength(1);
  });

  it('+++ should add validation error on onDrop rejection', () => {
    const wrapper = mount(
      <FileUploadComponentClass
        id={mockId}
        component={mockComponent}
        isValid={mockIsValid}
        language={{}}
        attachments={mockAttachments}
      />,
    );
    const instance = wrapper.instance() as FileUploadComponentClass;
    expect(instance.state.validations.length).toBe(0);
    instance.onDrop([], mockFileList);
    expect(instance.state.validations.length).toBe(1);
  });

  it('+++ should trigger onDelete on when delete is clicked and update state to deleting for that attachment', () => {
    const wrapper = mount(
      <FileUploadComponentClass
        id={mockId}
        component={mockComponent}
        isValid={mockIsValid}
        language={{}}
        attachments={mockAttachments}
      />,
    );
    const instance = wrapper.instance() as FileUploadComponentClass;
    const spy = jest.spyOn(instance, 'handleDeleteFile');
    wrapper.find('#attachment-delete-0').simulate('click');
    // workaround - have to click twice the first time
    wrapper.find('#attachment-delete-0').simulate('click');
    expect(instance.state.attachments[0].deleting).toBe(true);
    expect(spy).toHaveBeenCalled();
  });

  it('+++ should not display drop area when in simple mode and attachments exists', () => {
    const wrapper = mount(
      <FileUploadComponentClass
        id={mockId}
        component={mockComponent}
        isValid={mockIsValid}
        language={{}}
        attachments={mockAttachments}
      />,
    );
    expect(wrapper.find('#altinn-drop-zone-' + mockId)).toHaveLength(0);
  });
});
