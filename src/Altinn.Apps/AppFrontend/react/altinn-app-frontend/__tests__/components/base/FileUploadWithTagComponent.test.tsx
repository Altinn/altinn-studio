/* eslint-disable no-undef */
/* eslint-disable indent */
import { mount } from 'enzyme';
import 'jest';
import * as React from 'react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { render } from '@testing-library/react';
import { FileUploadWithTagComponent, IFileUploadWithTagProps } from '../../../src/components/base/FileUploadWithTagComponent';
import { getFileEnding, removeFileEnding } from '../../../src/utils/attachment';
import { getFileUploadComponentValidations, parseFileUploadComponentWithTagValidationObject } from '../../../src/utils/formComponentUtils';
import { ITextResourceBindings } from '../../../src/features/form/layout';


describe('>>> components/base/FileUploadWithTagComponent.tsx', () => { // TODO
  let mockId: string;
  let mockIsValid: boolean;
  let mockMaxFileSizeInMB: number;
  let mockMaxNumberOfAttachments: number;
  let mockMinNumberOfAttachments: number;
  let mockReadOnly: boolean;
  let mockAttachments: any[];
  let mockInitialState: any;
  let mockOptionsId: string;
  let mockStore: any;
  let mockGetTextResource: (key: string) => string;
  let mockGetTextResourceAsString: (key: string) => string;
  let mockTextResourceBindings: ITextResourceBindings;

  beforeEach(() => {
    const createStore = configureStore();
    mockId = 'mockId';
    mockAttachments = [
      { name: 'attachment-name-1', id: 'attachment-id-1', size: '1200', uploaded: true, deleting: false, updating: false, tags: ['mock-tag-1'] },
      { name: 'attachment-name-2', id: 'attachment-id-2', size: '800', uploaded: false, deleting: false, updating: false, tags: ['mock-tag-2'] },
      { name: 'attachment-name-3', id: 'attachment-id-3', size: '400', uploaded: true, deleting: true, updating: false, tags: ['mock-tag-3'] },
      { name: 'attachment-name-4', id: 'attachment-id-4', size: '200', uploaded: true, deleting: true, updating: false, tags: [] },
      { name: 'attachment-name-5', id: 'attachment-id-5', size: '100', uploaded: true, deleting: false, updating: true, tags: [] },
      { name: 'attachment-name-6', id: 'attachment-id-6', size: '100', uploaded: true, deleting: false, updating: false, tags: [] },
    ];
    mockTextResourceBindings = {
      'tagTitle': 'mock-tag-title',
      'mock-tag-label-1': "mock-tag-value-1",
      'mock-tag-label-2': "mock-tag-value-2",
      'mock-tag-label-3': "mock-tag-value-3",
    }
    mockInitialState = {
      attachments: {
        attachments: {
          mockId: mockAttachments,
        },
        validationResults: {
          mockId: {
            simpleBinding: {
              errors: ['mock error message', 'attachment-id-5' + String.fromCharCode(31) + 'mock error message'],
            },
          },
        },
      },
      optionState: {
        options: {
          test: [
            { value: 'mock-tag-1', label: 'mock-tag-label-1' },
            { value: 'mock-tag-2', label: 'mock-tag-label-2' },
            { value: 'mock-tag-3', label: 'mock-tag-label-3' }
          ],
        },
      },
      formLayout: {
        uiConfig: {
          fileUploadersWithTag: {
            'mockId': {
              editIndex: -1,
              chosenOptions: {
                'attachment-id-1': 'mock-tag-1',
                'attachment-id-2': 'mock-tag-2',
                'attachment-id-3': 'mock-tag-3',
              }
            }
          }
        }
      }
    };
    mockOptionsId = 'test';
    mockMaxNumberOfAttachments = 7;
    mockMinNumberOfAttachments = 1;
    mockMaxFileSizeInMB = 2;
    mockIsValid = true;
    mockReadOnly = false;
    mockStore = createStore(mockInitialState);
    mockGetTextResource = () => 'test';
    mockGetTextResourceAsString = () => 'test';
  });

  it('+++ should show spinner when file is uploading or updating ', () => {
    const wrapper = mount(
      <Provider store={mockStore}>
        <FileUploadWithTagComponent
          id={mockId}
          isValid={mockIsValid}
          language={{}}
          maxFileSizeInMB={mockMaxFileSizeInMB}
          maxNumberOfAttachments={mockMaxNumberOfAttachments}
          minNumberOfAttachments={mockMinNumberOfAttachments}
          readOnly={mockReadOnly}
          optionsId={mockOptionsId}
          getTextResource={mockGetTextResource}
          getTextResourceAsString={mockGetTextResourceAsString}
          textResourceBindings={mockTextResourceBindings}
        />
      </Provider>
    );
    expect(wrapper.find(`#attachment-loader-upload-${mockAttachments[1].id}`)).toHaveLength(2); // div and react node
    expect(wrapper.find(`#attachment-loader-update-${mockAttachments[4].id}`)).toHaveLength(2); // div and react node
  });

  it('+++ should disable dropdown when updating', () => {
    const wrapper = mount(
      <Provider store={mockStore}>
        <FileUploadWithTagComponent
          id={mockId}
          isValid={mockIsValid}
          language={{}}
          maxFileSizeInMB={mockMaxFileSizeInMB}
          maxNumberOfAttachments={mockMaxNumberOfAttachments}
          minNumberOfAttachments={mockMinNumberOfAttachments}
          readOnly={mockReadOnly}
          optionsId={mockOptionsId}
          getTextResource={mockGetTextResource}
          getTextResourceAsString={mockGetTextResourceAsString}
          textResourceBindings={mockTextResourceBindings}
        />
      </Provider>
    );
    expect(wrapper.find(`#attachment-loader-update-${mockAttachments[4].id}`)).toHaveLength(2); // div and react node
    expect(wrapper.find(`#attachment-tag-dropdown-${mockAttachments[4].id}`).props().disabled).toBeTruthy();
  });

  it('+++ should not display drop area when max attachments is reached', () => {
    const wrapper = mount(
      <Provider store={mockStore}>
        <FileUploadWithTagComponent
          id={mockId}
          isValid={mockIsValid}
          language={{}}
          maxFileSizeInMB={mockMaxFileSizeInMB}
          maxNumberOfAttachments={6}
          minNumberOfAttachments={mockMinNumberOfAttachments}
          readOnly={mockReadOnly}
          optionsId={mockOptionsId}
          getTextResource={mockGetTextResource}
          getTextResourceAsString={mockGetTextResourceAsString}
          textResourceBindings={mockTextResourceBindings}
        />
      </Provider>
    );
    expect(wrapper.find(`#altinn-drop-zone-${mockId}`)).toHaveLength(0);
  });

  it('+++ should display drop area when max attachments is not reached', () => {
    const wrapper = mount(
      <Provider store={mockStore}>
        <FileUploadWithTagComponent
          id={mockId}
          isValid={mockIsValid}
          language={{}}
          maxFileSizeInMB={mockMaxFileSizeInMB}
          maxNumberOfAttachments={mockMaxNumberOfAttachments}
          minNumberOfAttachments={mockMinNumberOfAttachments}
          readOnly={mockReadOnly}
          optionsId={mockOptionsId}
          getTextResource={mockGetTextResource}
          getTextResourceAsString={mockGetTextResourceAsString}
          textResourceBindings={mockTextResourceBindings}
        />
      </Provider>
    );
    expect(wrapper.find(`#altinn-drop-zone-${mockId}`)).toHaveLength(1);
  });

  it('+++ should display validation error when saving when no tag is selected', () => {
    const wrapper = mount(
      <Provider store={mockStore}>
        <FileUploadWithTagComponent
          id={mockId}
          isValid={mockIsValid}
          language={{}}
          maxFileSizeInMB={mockMaxFileSizeInMB}
          maxNumberOfAttachments={mockMaxNumberOfAttachments}
          minNumberOfAttachments={mockMinNumberOfAttachments}
          readOnly={mockReadOnly}
          optionsId={mockOptionsId}
          getTextResource={mockGetTextResource}
          getTextResourceAsString={mockGetTextResourceAsString}
          textResourceBindings={mockTextResourceBindings}
        />
      </Provider>
    );
    const button = wrapper.find(`#attachment-save-tag-button-${mockAttachments[5].id}`)
    button.at(0).simulate('click')
    expect(wrapper.find(`#attachment-error-${mockAttachments[5].id}`)).toHaveLength(2); // div and react node
  });

  it('+++ should have open edit windows for attachments without tags.', () => {
    const wrapper = mount(
      <Provider store={mockStore}>
        <FileUploadWithTagComponent
          id={mockId}
          isValid={mockIsValid}
          language={{}}
          maxFileSizeInMB={mockMaxFileSizeInMB}
          maxNumberOfAttachments={mockMaxNumberOfAttachments}
          minNumberOfAttachments={mockMinNumberOfAttachments}
          readOnly={mockReadOnly}
          optionsId={mockOptionsId}
          getTextResource={mockGetTextResource}
          getTextResourceAsString={mockGetTextResourceAsString}
          textResourceBindings={mockTextResourceBindings}
        />
      </Provider>
    );
    expect(wrapper.find(`#attachment-edit-window-${mockAttachments[3].id}`)).toHaveLength(1);
    expect(wrapper.find(`#attachment-edit-window-${mockAttachments[4].id}`)).toHaveLength(1);
  });

  it('+++ getFileUploadWithTagComponentValidations should return correct validation', () => {
    const mockLanguage = {
      language: {
        form_filler: {
          file_uploader_validation_error_delete: 'Noe gikk galt under slettingen av filen, prøv igjen senere.',
          file_uploader_validation_error_upload: 'Noe gikk galt under opplastingen av filen, prøv igjen senere.',
          file_uploader_validation_error_update: 'Noe gikk galt under oppdatering av filens merking, prøv igjen senere.',
        },
      },
    };
    let validation = getFileUploadComponentValidations('upload', mockLanguage.language);
    expect(validation).toEqual({ simpleBinding: { errors: ['Noe gikk galt under opplastingen av filen, prøv igjen senere.'], warnings: [] } });

    validation = getFileUploadComponentValidations('update', mockLanguage.language);
    expect(validation).toEqual({ simpleBinding: { errors: ['Noe gikk galt under oppdatering av filens merking, prøv igjen senere.'], warnings: [] } });

    validation = getFileUploadComponentValidations('update', mockLanguage.language, 'mock-attachment-id');
    expect(validation).toEqual({ simpleBinding: { errors: ['mock-attachment-id' + String.fromCharCode(31) + 'Noe gikk galt under oppdatering av filens merking, prøv igjen senere.'], warnings: [] } });

    validation = getFileUploadComponentValidations('delete', mockLanguage.language);
    expect(validation).toEqual({ simpleBinding: { errors: ['Noe gikk galt under slettingen av filen, prøv igjen senere.'], warnings: [] } });
  });

  it('+++ parseFileUploadComponentWithTagValidationObject should return correct validation array', () => {
    const mockValidations = [
      'Noe gikk galt under opplastingen av filen, prøv igjen senere.',
      'Noe gikk galt under oppdatering av filens merking, prøv igjen senere.',
      'mock-attachment-id' + String.fromCharCode(31) + 'Noe gikk galt under oppdatering av filens merking, prøv igjen senere.',
      'Noe gikk galt under slettingen av filen, prøv igjen senere.',
    ];
    const expectedResult = [
      {id: '', message: 'Noe gikk galt under opplastingen av filen, prøv igjen senere.'},
      {id: '', message: 'Noe gikk galt under oppdatering av filens merking, prøv igjen senere.'},
      {id: 'mock-attachment-id', message: 'Noe gikk galt under oppdatering av filens merking, prøv igjen senere.'},
      {id: '', message: 'Noe gikk galt under slettingen av filen, prøv igjen senere.'},
    ]

    const validationArray = parseFileUploadComponentWithTagValidationObject(mockValidations);
    expect(validationArray).toEqual(expectedResult);
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

  function renderFileUploadWithTagComponent(props: Partial<IFileUploadWithTagProps> = {}) {
    const defaultProps: IFileUploadWithTagProps = {
      id: mockId,
      language: {},
      maxFileSizeInMB: mockMaxFileSizeInMB,
      maxNumberOfAttachments: mockMaxNumberOfAttachments,
      minNumberOfAttachments: mockMinNumberOfAttachments,
      isValid: mockIsValid,
      readOnly: mockReadOnly,
      optionsId: mockOptionsId,
      getTextResource: mockGetTextResource,
      getTextResourceAsString: mockGetTextResourceAsString,
      textResourceBindings: mockTextResourceBindings
    };

    return render(
      <Provider store={mockStore}>
        <FileUploadWithTagComponent {...defaultProps} {...props}/>
      </Provider>
    );
  }
});
