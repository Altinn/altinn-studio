import { mount } from 'enzyme';
import 'jest';
import * as React from 'react';
import { Provider } from 'react-redux';
import * as renderer from 'react-test-renderer';
import configureStore from 'redux-mock-store';
import { FileUploadComponent, FileUploadComponentClass, getFileUploadComponentValidations } from '../../../src/components/base/FileUploadComponent';
import { mapAttachmentListApiResponseToAttachments } from '../../../src/utils/attachment';

describe('>>> components/base/FileUploadComponent.tsx', () => {
  let mockDisplayMode: string;
  let mockHasCustomFileEndings: boolean;
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
      formAttachments: {
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
    mockHasCustomFileEndings = false;
    mockDisplayMode = 'simple';
    mockIsValid = true;
    mockReadOnly = false;
    mockFileList = [{ name: 'mock-name.txt', lastModified: null, size: 100, slice: null, type: null }];
    mockStore = createStore(mockInitialState);
  });

  it('+++ should match snapshot', () => {
    const rendered = renderer.create(
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
      </Provider>,
    );
    expect(rendered).toMatchSnapshot();
  });

  it('+++ should show spinner when file is uploading or deleting', () => {
    const wrapper = mount(
      <FileUploadComponentClass
        displayMode={mockDisplayMode}
        id={mockId}
        isValid={mockIsValid}
        language={{}}
        maxFileSizeInMB={mockMaxFileSizeInMB}
        maxNumberOfAttachments={mockMaxNumberOfAttachments}
        minNumberOfAttachments={mockMinNumberOfAttachments}
        readOnly={mockReadOnly}
        attachments={mockAttachments}
      />,
    );
    expect(wrapper.find('#loader-upload')).toHaveLength(1);
    expect(wrapper.find('#loader-delete')).toHaveLength(1);
  });

  it('+++ should add validation error on onDrop rejection', () => {
    const wrapper = mount(
      <FileUploadComponentClass
        displayMode={mockDisplayMode}
        id={mockId}
        isValid={mockIsValid}
        language={{}}
        maxFileSizeInMB={mockMaxFileSizeInMB}
        maxNumberOfAttachments={mockMaxNumberOfAttachments}
        minNumberOfAttachments={mockMinNumberOfAttachments}
        readOnly={mockReadOnly}
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
        displayMode={mockDisplayMode}
        id={mockId}
        isValid={mockIsValid}
        language={{}}
        maxFileSizeInMB={mockMaxFileSizeInMB}
        maxNumberOfAttachments={mockMaxNumberOfAttachments}
        minNumberOfAttachments={mockMinNumberOfAttachments}
        readOnly={mockReadOnly}
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
        displayMode={mockDisplayMode}
        id={mockId}
        isValid={mockIsValid}
        language={{}}
        maxFileSizeInMB={mockMaxFileSizeInMB}
        maxNumberOfAttachments={mockMaxNumberOfAttachments}
        minNumberOfAttachments={mockMinNumberOfAttachments}
        readOnly={mockReadOnly}
        attachments={mockAttachments}
      />,
    );
    expect(wrapper.find('#altinn-drop-zone-' + mockId)).toHaveLength(0);
  });

  it('+++ should map api-response to correct redux structure', () => {
    const mockApiResponse: any = [
      {
        type: 'mockType', attachments: [
          { name: 'name1', size: 400, id: 'id1' },
        ],
      },
      {
        type: 'mockType2', attachments: [
          { name: '2-name1', size: 400, id: '2-id1' },
          { name: '2-name2', size: 800, id: '2-id2' },
        ],
      },
      {
        type: 'mockType3', attachments: [],
      },
      {
        type: 'mockType4', // response with missing attachments
      },
      {
        attachments: [], // response with missing type
      },
      {
        // mapper should handle empty response
      },
    ];
    const mappedResponse = mapAttachmentListApiResponseToAttachments(mockApiResponse);

    expect(mappedResponse.mockType.length).toBe(1);
    expect(mappedResponse.mockType[0].name).toBe('name1');
    expect(mappedResponse.mockType[0].size).toBe(400);
    expect(mappedResponse.mockType[0].id).toBe('id1');

    expect(mappedResponse.mockType2.length).toBe(2);
    expect(mappedResponse.mockType2[0].name).toBe('2-name1');
    expect(mappedResponse.mockType2[0].size).toBe(400);
    expect(mappedResponse.mockType2[0].id).toBe('2-id1');
    expect(mappedResponse.mockType2[1].name).toBe('2-name2');
    expect(mappedResponse.mockType2[1].size).toBe(800);
    expect(mappedResponse.mockType2[1].id).toBe('2-id2');

    expect(mappedResponse.mockType3.length).toBe(0);

    expect(mappedResponse.mockType4.length).toBe(0);

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
    expect(validation).toEqual
      ({ simpleBinding: { errors: ['Noe gikk galt under opplastingen av filen, prøv igjen senere'], warnings: [] } });

    validation = getFileUploadComponentValidations('delete', mockLanguage.language);
    expect(validation).toEqual
      ({ simpleBinding: { errors: ['Noe gikk galt under slettingen av filen, prøv igjen senere.'], warnings: [] } });
  });

});
