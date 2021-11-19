/* eslint-disable no-undef */
/* eslint-disable indent */
import { mount } from 'enzyme';
import 'jest';
import * as React from 'react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { render } from '@testing-library/react';
import { bytesInOneMB, FileUploadComponent, IFileUploadProps } from '../../../src/components/base/FileUploadComponent';
import { getFileEnding, removeFileEnding } from '../../../src/utils/attachment';
import { getFileUploadComponentValidations } from '../../../src/utils/formComponentUtils';


describe('>>> components/base/FileUploadComponent.tsx', () => {
  let mockDisplayMode: string;
  let mockId: string;
  let mockIsValid: boolean;
  let mockMaxFileSizeInMB: number;
  let mockMaxNumberOfAttachments: number;
  let mockMinNumberOfAttachments: number;
  let mockReadOnly: boolean;
  let mockAttachments: any[];
  let mockFileList: File[];
  let mockInitialState: any;
  let mockStore: any;

  beforeEach(() => {
    const createStore = configureStore();
    mockId = 'mockId';
    mockAttachments = [
      { name: 'attachment-name-1', id: 'attachment-id-1', size: '1200', uploaded: true, deleting: false },
      { name: 'attachment-name-2', id: 'attachment-id-2', size: '800', uploaded: false, deleting: false },
      { name: 'attachment-name-3', id: 'attachment-id-3', size: '400', uploaded: true, deleting: true },
    ];
    mockInitialState = {
      attachments: {
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
    mockMaxNumberOfAttachments = 4;
    mockMinNumberOfAttachments = 1;
    mockMaxFileSizeInMB = 2;
    mockDisplayMode = 'simple';
    mockIsValid = true;
    mockReadOnly = false;
    mockFileList = [
      { name: 'mock-name-1.txt', lastModified: null, size: 100, slice: null, type: null, arrayBuffer: null, stream: null, text: null, webkitRelativePath: null },
      { name: 'mock-name-2.txt', lastModified: null, size: 100, slice: null, type: null, arrayBuffer: null, stream: null, text: null, webkitRelativePath: null },
      { name: 'mock-name-3.txt', lastModified: null, size: 100, slice: null, type: null, arrayBuffer: null, stream: null, text: null, webkitRelativePath: null },
      { name: 'mock-name-4.txt', lastModified: null, size: 200 * bytesInOneMB, slice: null, type: null, arrayBuffer: null, stream: null, text: null, webkitRelativePath: null },
      { name: 'mock-name-5.txt', lastModified: null, size: 200 * bytesInOneMB, slice: null, type: null, arrayBuffer: null, stream: null, text: null, webkitRelativePath: null },
    ];
    mockStore = createStore(mockInitialState);
  });

  it('+++ should match snapshot', () => {
    const {asFragment} = renderFileUploadComponent();
    expect(asFragment()).toMatchSnapshot();
  });

  it('+++ should show spinner when file is uploading or deleting', () => {
    const wrapper = mount(
      <Provider store={mockStore}>
        <FileUploadComponent
          displayMode={mockDisplayMode}
          id={mockId}
          isValid={mockIsValid}
          language={{}}
          maxFileSizeInMB={mockMaxFileSizeInMB}
          maxNumberOfAttachments={mockMaxNumberOfAttachments}
          minNumberOfAttachments={mockMinNumberOfAttachments}
          readOnly={mockReadOnly}
        />
      </Provider>
    );
    expect(wrapper.find('#loader-upload')).toHaveLength(2); // div and react node
    expect(wrapper.find('#loader-delete')).toHaveLength(2); // div and react node
  });

//   it('+++ should add validation error on onDrop rejection', () => {
//     const wrapper = mount(
//       <FileUploadComponentClass
//         displayMode={mockDisplayMode}
//         id={mockId}
//         isValid={mockIsValid}
//         language={{}}
//         maxFileSizeInMB={mockMaxFileSizeInMB}
//         maxNumberOfAttachments={mockMaxNumberOfAttachments}
//         minNumberOfAttachments={mockMinNumberOfAttachments}
//         readOnly={mockReadOnly}
//         attachments={mockAttachments}
//       />,
//     );
//     const instance = wrapper.instance() as FileUploadComponentClass;
//     expect(instance.state.validations.length).toBe(0);
//     instance.onDrop([], mockFileList);
//     expect(instance.state.validations.length).toBe(1);
//   });

//   it('+++ should not upload any files if number of files are greater than max files', () => {
//     const wrapper = mount(
//       <FileUploadComponentClass
//         displayMode={mockDisplayMode}
//         id={mockId}
//         isValid={mockIsValid}
//         language={{}}
//         maxFileSizeInMB={mockMaxFileSizeInMB}
//         maxNumberOfAttachments={mockMaxNumberOfAttachments}
//         minNumberOfAttachments={mockMinNumberOfAttachments}
//         readOnly={mockReadOnly}
//         attachments={mockAttachments}
//       />,
//     );
//     const instance = wrapper.instance() as FileUploadComponentClass;
//     const spy = jest.spyOn(instance, 'setState');
//     instance.onDrop(mockFileList, []);
//     const call = spy.mock.calls[0][0] as any;
//     expect(call.attachments.length).toBe(mockAttachments.length);
//   });

//   it('+++ should upload all files if number of accepted files are less then max allowed files', () => {
//     const mockAccepted = [{ name: 'mock-name-1.txt', lastModified: null, size: 100, slice: null, type: null }];
//     const wrapper = mount(
//       <FileUploadComponentClass
//         displayMode={mockDisplayMode}
//         id={mockId}
//         isValid={mockIsValid}
//         language={{}}
//         maxFileSizeInMB={mockMaxFileSizeInMB}
//         maxNumberOfAttachments={mockMaxNumberOfAttachments}
//         minNumberOfAttachments={mockMinNumberOfAttachments}
//         readOnly={mockReadOnly}
//         attachments={mockAttachments}
//       />,
//     );
//     const instance = wrapper.instance() as FileUploadComponentClass;
//     const spy = jest.spyOn(instance, 'setState');
//     instance.onDrop(mockAccepted, []);
//     const call = spy.mock.calls[0][0] as any;
//     expect(call.attachments.length).toBe(mockAttachments.length + mockAccepted.length);
//   });

//   it('+++ should add validation messages if file is rejected', () => {
//     const wrapper = mount(
//       <FileUploadComponentClass
//         displayMode={mockDisplayMode}
//         id={mockId}
//         isValid={mockIsValid}
//         language={{}}
//         maxFileSizeInMB={10}
//         maxNumberOfAttachments={10}
//         minNumberOfAttachments={mockMinNumberOfAttachments}
//         readOnly={mockReadOnly}
//         attachments={mockAttachments}
//       />,
//     );
//     const instance = wrapper.instance() as FileUploadComponentClass;
//     const spy = jest.spyOn(instance, 'setState');
//     instance.onDrop([], mockFileList);
//     const call = spy.mock.calls[0][0] as any;
//     expect(call.validations.length).toBe(mockFileList.length);
//     expect(call.validations[0]).toBe('form_filler.file_uploader_validation_error_general_1 mock-name-1.txt form_filler.file_uploader_validation_error_general_2');
//     expect(call.validations[3]).toBe('mock-name-4.txt form_filler.file_uploader_validation_error_file_size');
//   });

//   it('+++ should trigger onDelete on when delete is clicked and update state to deleting for that attachment', () => {
//     const wrapper = mount(
//       <FileUploadComponentClass
//         displayMode={mockDisplayMode}
//         id={mockId}
//         isValid={mockIsValid}
//         language={{}}
//         maxFileSizeInMB={mockMaxFileSizeInMB}
//         maxNumberOfAttachments={mockMaxNumberOfAttachments}
//         minNumberOfAttachments={mockMinNumberOfAttachments}
//         readOnly={mockReadOnly}
//         attachments={mockAttachments}
//       />,
//     );
//     const instance = wrapper.instance() as FileUploadComponentClass;
//     const spy = jest.spyOn(instance, 'handleDeleteFile');
//     wrapper.find('#attachment-delete-0').simulate('click');
//     // workaround - have to click twice the first time
//     wrapper.find('#attachment-delete-0').simulate('click');
//     expect(instance.state.attachments[0].deleting).toBe(true);
//     expect(spy).toHaveBeenCalled();
//   });

  it('+++ should not display drop area when in simple mode and attachments exists', () => {
    const wrapper = mount(
      <Provider store={mockStore}>
        <FileUploadComponent
          displayMode={mockDisplayMode}
          id={mockId}
          isValid={mockIsValid}
          language={{}}
          maxFileSizeInMB={mockMaxFileSizeInMB}
          maxNumberOfAttachments={mockMaxNumberOfAttachments}
          minNumberOfAttachments={mockMinNumberOfAttachments}
          readOnly={mockReadOnly}
        />
      </Provider>
    );
    expect(wrapper.find(`#altinn-drop-zone-${mockId}`)).toHaveLength(0);
  });

  it('+++ getFileUploadComponentValidations should return correct validation', () => {
    const mockLanguage = {
      language: {
        form_filler: {
          file_uploader_validation_error_delete: 'Noe gikk galt under slettingen av filen, prøv igjen senere.',
          file_uploader_validation_error_upload: 'Noe gikk galt under opplastingen av filen, prøv igjen senere',

        },
      },
    };
    let validation = getFileUploadComponentValidations('upload', mockLanguage.language);
    expect(validation).toEqual({ simpleBinding: { errors: ['Noe gikk galt under opplastingen av filen, prøv igjen senere'], warnings: [] } });

    validation = getFileUploadComponentValidations('delete', mockLanguage.language);
    expect(validation).toEqual({ simpleBinding: { errors: ['Noe gikk galt under slettingen av filen, prøv igjen senere.'], warnings: [] } });
  });

  it('+++ should get file ending correctly', () => {
    expect(getFileEnding('test.jpg')).toEqual('.jpg');
    expect(getFileEnding('navn.med.punktum.xml')).toEqual('.xml');
    expect(getFileEnding('navnutenfilendelse')).toEqual('');
    expect(getFileEnding(null)).toEqual('');
  });

  it('+++ should remove file ending correctly', () => {
    expect(removeFileEnding('test.jpg')).toEqual('test');
    expect(removeFileEnding('navn.med.punktum.xml')).toEqual('navn.med.punktum');
    expect(removeFileEnding('navnutenfilendelse')).toEqual('navnutenfilendelse');
    expect(removeFileEnding(null)).toEqual('');
  });

//   it('+++ should not show file upload when max files is reached', () => {
//     const wrapper = mount(
//       <FileUploadComponentClass
//         displayMode={mockDisplayMode}
//         id={mockId}
//         isValid={mockIsValid}
//         language={{}}
//         maxFileSizeInMB={mockMaxFileSizeInMB}
//         maxNumberOfAttachments={3}
//         minNumberOfAttachments={mockMinNumberOfAttachments}
//         readOnly={mockReadOnly}
//         attachments={mockAttachments}
//       />,
//     );
//     const instance = wrapper.instance() as FileUploadComponentClass;
//     const result = instance.shouldShowFileUpload();
//     expect(result).toBe(false);
//   });
  function renderFileUploadComponent(props: Partial<IFileUploadProps> = {}) {
    const defaultProps: IFileUploadProps = {
      id: mockId,
      displayMode: mockDisplayMode,
      language: {},
      maxFileSizeInMB: mockMaxFileSizeInMB,
      maxNumberOfAttachments: mockMaxNumberOfAttachments,
      minNumberOfAttachments: mockMinNumberOfAttachments,
      isValid: mockIsValid,
      readOnly: mockReadOnly,
    };

    return render(
      <Provider store={mockStore}>
        <FileUploadComponent {...defaultProps} {...props}/>
      </Provider>
    );
  }
});
