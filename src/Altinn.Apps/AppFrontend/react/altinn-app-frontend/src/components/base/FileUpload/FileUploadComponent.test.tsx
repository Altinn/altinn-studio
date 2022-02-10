import { mount } from 'enzyme';
import * as React from 'react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { render } from '@testing-library/react';

import type { IComponentProps } from 'src/components';

import { getFileEnding, removeFileEnding } from '../../../utils/attachment';
import { getFileUploadComponentValidations } from '../../../utils/formComponentUtils';
import { FileUploadComponent, IFileUploadProps } from './FileUploadComponent';

describe('FileUploadComponent', () => {
  let mockDisplayMode: string;
  let mockId: string;
  let mockIsValid: boolean;
  let mockMaxFileSizeInMB: number;
  let mockMaxNumberOfAttachments: number;
  let mockMinNumberOfAttachments: number;
  let mockReadOnly: boolean;
  let mockAttachments: any[];
  let mockInitialState: any;
  let mockStore: any;

  beforeEach(() => {
    const createStore = configureStore();
    mockId = 'mockId';
    mockAttachments = [
      {
        name: 'attachment-name-1',
        id: 'attachment-id-1',
        size: '1200',
        uploaded: true,
        deleting: false,
      },
      {
        name: 'attachment-name-2',
        id: 'attachment-id-2',
        size: '800',
        uploaded: false,
        deleting: false,
      },
      {
        name: 'attachment-name-3',
        id: 'attachment-id-3',
        size: '400',
        uploaded: true,
        deleting: true,
      },
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
    mockStore = createStore(mockInitialState);
  });

  it('should match snapshot', () => {
    const { asFragment } = renderFileUploadComponent();
    expect(asFragment()).toMatchSnapshot();
  });

  it('should show spinner when file is uploading or deleting', () => {
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
          {...({} as IComponentProps)}
        />
      </Provider>,
    );
    expect(wrapper.find('#loader-upload')).toHaveLength(2);
    expect(wrapper.find('#loader-delete')).toHaveLength(2);
  });

  it('should not display drop area when in simple mode and attachments exists', () => {
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
          {...({} as IComponentProps)}
        />
      </Provider>,
    );
    expect(wrapper.find(`#altinn-drop-zone-${mockId}`)).toHaveLength(0);
  });

  it('getFileUploadComponentValidations should return correct validation', () => {
    const mockLanguage = {
      language: {
        form_filler: {
          file_uploader_validation_error_delete:
            'Noe gikk galt under slettingen av filen, prøv igjen senere.',
          file_uploader_validation_error_upload:
            'Noe gikk galt under opplastingen av filen, prøv igjen senere',
        },
      },
    };
    let validation = getFileUploadComponentValidations(
      'upload',
      mockLanguage.language,
    );
    expect(validation).toEqual({
      simpleBinding: {
        errors: [
          'Noe gikk galt under opplastingen av filen, prøv igjen senere',
        ],
        warnings: [],
      },
    });

    validation = getFileUploadComponentValidations(
      'delete',
      mockLanguage.language,
    );
    expect(validation).toEqual({
      simpleBinding: {
        errors: ['Noe gikk galt under slettingen av filen, prøv igjen senere.'],
        warnings: [],
      },
    });
  });

  it('should get file ending correctly', () => {
    expect(getFileEnding('test.jpg')).toEqual('.jpg');
    expect(getFileEnding('navn.med.punktum.xml')).toEqual('.xml');
    expect(getFileEnding('navnutenfilendelse')).toEqual('');
    expect(getFileEnding(null)).toEqual('');
  });

  it('should remove file ending correctly', () => {
    expect(removeFileEnding('test.jpg')).toEqual('test');
    expect(removeFileEnding('navn.med.punktum.xml')).toEqual(
      'navn.med.punktum',
    );
    expect(removeFileEnding('navnutenfilendelse')).toEqual(
      'navnutenfilendelse',
    );
    expect(removeFileEnding(null)).toEqual('');
  });

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
    } as IFileUploadProps;

    return render(
      <Provider store={mockStore}>
        <FileUploadComponent {...defaultProps} {...props} />
      </Provider>,
    );
  }
});
