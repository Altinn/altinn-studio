import * as React from 'react';
import DropZone from 'react-dropzone';
import { connect } from 'react-redux';
import uuid = require('uuid');
import altinnTheme from '../../../../shared/src/theme/altinnStudioTheme';
import { getLanguageFromKey } from '../../../../shared/src/utils/language';
import { IAttachment } from '../../sharedResources/attachments';
import AttachmentDispatcher from '../../sharedResources/attachments/attachmentActions';
import '../../styles/FileUploadComponent.css';
import { renderValidationMessagesForComponent } from '../../utils/render';

import { IRuntimeState } from '../../types';
import { IComponentValidations } from '../../types/global';

export interface IFileUploadProvidedProps {
  displayMode: string;
  hasCustomFileEndings?: boolean;
  id: string;
  isValid?: boolean;
  validationMessages?: IComponentValidations;
  language: any;
  maxFileSizeInMB: number;
  maxNumberOfAttachments: number;
  minNumberOfAttachments: number;
  readOnly: boolean;
  validFileEndings?: string;
}

export interface IFileUploadProps extends IFileUploadProvidedProps {
  attachments: IAttachment[];
}

export interface IFileUploadState {
  title: string;
  description: string;
  attachments: IAttachment[];
  showFileUpload: boolean;
  validations: string[];
  test: string;
}

const baseStyle = {
  width: 'auto',
  height: '15.6rem',
  borderWidth: '2px',
  borderColor: altinnTheme.altinnPalette.primary.blue,
  borderStyle: 'dashed',
  cursor: 'pointer',
};
const activeStyle = {
  borderStyle: 'solid',
};
const rejectStyle = {
  borderStyle: 'solid',
  borderColor: altinnTheme.altinnPalette.primary.red,
};
const validationErrorStyle = {
  borderStyle: 'dashed',
  borderColor: altinnTheme.altinnPalette.primary.red,
};

export const bytesInOneMB = 1048576;

export class FileUploadComponentClass
  extends React.Component<IFileUploadProps, IFileUploadState> {

  public static getDerivedStateFromProps(props: IFileUploadProps, state: IFileUploadState): IFileUploadState {
    return {
      ...state,
      attachments: props.attachments,
    };
  }

  constructor(props: IFileUploadProps, state: IFileUploadState) {
    super(props, state);
    this.state = {
      attachments: props.attachments || [],
      validations: [],
      ...state,
    };
  }

  public onDrop = (acceptedFiles: File[], rejectedFiles: File[]) => {
    const newFiles: IAttachment[] = [];
    const fileType = this.props.id; // component id used as filetype identifier for now, see issue #1364
    acceptedFiles.forEach((file: File) => {
      if ((this.state.attachments.length + newFiles.length) < this.props.maxNumberOfAttachments) {
        const tmpId: string = uuid();
        newFiles.push({ name: file.name, size: file.size, uploaded: false, id: tmpId, deleting: false });
        AttachmentDispatcher.uploadAttachment(file, fileType, tmpId, this.props.id);
      }
    });
    const validations: string[] = [];
    if (rejectedFiles.length > 0) {
      rejectedFiles.forEach((file) => {
        if (file.size > (this.props.maxFileSizeInMB * bytesInOneMB)) {
          validations.push(
            file.name + ' ' +
            getLanguageFromKey('form_filler.file_uploader_validation_error_file_size', this.props.language));
        } else {
          validations.push(
            getLanguageFromKey('form_filler.file_uploader_validation_error_general_1', this.props.language) + ' ' +
            file.name + ' ' +
            getLanguageFromKey('form_filler.file_uploader_validation_error_general_2', this.props.language));
        }
      });
    }
    const showFileUpload = (this.props.displayMode === 'simple') ? false :
      (this.props.attachments.length < this.props.maxFileSizeInMB);
    this.setState({
      attachments: this.state.attachments.concat(newFiles),
      // if simple mode, we should hide list on each drop
      showFileUpload,
      validations,
    });
  }

  public handleDeleteFile = (index: number) => {
    const attachmentToDelete = this.state.attachments[index];
    if (!attachmentToDelete.uploaded) {
      return;
    }
    const fileType = this.props.id; // component id used as filetype identifier for now, see issue #1364
    attachmentToDelete.deleting = true;
    const newList = this.state.attachments.slice();
    newList[index] = attachmentToDelete;
    this.setState({
      attachments: newList,
    });
    AttachmentDispatcher.deleteAttachment(attachmentToDelete, fileType, this.props.id);
  }

  public getComponentValidations = (): IComponentValidations => {
    const { validations } = this.state;
    let { validationMessages } = this.props;
    if (!validationMessages || !validationMessages.simpleBinding) {
      validationMessages = {
        ['simpleBinding']: {
          errors: [],
          warnings: [],
        },
      };
    }
    if (!validations || validations.length === 0) {
      return validationMessages;
    }
    validations.forEach((message) => {
      validationMessages.simpleBinding.errors.push(message);
    });
    return validationMessages;
  }

  public renderFileList = (): JSX.Element => {
    if (!this.state.attachments || this.state.attachments.length === 0) {
      return null;
    }
    return (
      <div id={'altinn-file-list-' + this.props.id}>
        <table className={'file-upload-table'}>
          <thead>
            <tr className={'blue-underline'} id={'altinn-file-list-row-header'}>
              <th>{getLanguageFromKey('form_filler.file_uploader_list_header_name', this.props.language)}</th>
              <th>{getLanguageFromKey('form_filler.file_uploader_list_header_file_size', this.props.language)}</th>
              <th>{getLanguageFromKey('form_filler.file_uploader_list_header_status', this.props.language)}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {this.state.attachments.map((attachment: IAttachment, index: number) => {
              return (
                <tr key={index} className={'blue-underline-dotted'} id={'altinn-file-list-row-' + attachment.id}>
                  <td>{attachment.name}</td>
                  <td>{attachment.size}</td>
                  <td>
                    {attachment.uploaded &&
                      <div>
                        {getLanguageFromKey('form_filler.file_uploader_list_status_done', this.props.language)}
                        < i className='ai ai-check-circle' />
                      </div>
                    }
                    {!attachment.uploaded &&
                      <div className='a-loader' id={'loader-upload'}>
                        <div
                          className='loader loader-ellipsis'
                          style={{ marginLeft: '1.3rem', marginBottom: '1.6rem' }}
                        />
                      </div>
                    }
                  </td>
                  <td>
                    <div onClick={this.handleDeleteFile.bind(this, index)} id={'attachment-delete-' + index}>
                      {!attachment.deleting &&
                        <>
                          {getLanguageFromKey('form_filler.file_uploader_list_delete', this.props.language)}
                          <i className='ai ai-trash' />
                        </>
                      }
                      {attachment.deleting &&
                        <div className='a-loader' id={'loader-delete'}>
                          <div
                            className='loader loader-ellipsis'
                            style={{ marginBottom: '1.6rem', marginRight: '1.0rem' }}
                          />
                        </div>
                      }
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  public renderFileUploadContent = (): JSX.Element => {
    return (
      <div className={'container'}>
        <div className='col text-center icon' style={{ marginTop: '3.5rem' }} >
          <i className='ai ai-upload' />
        </div>
        <div className='col text-center'>
          <p className={'file-upload-text-bold'}>
            {getLanguageFromKey('form_filler.file_uploader_drag', this.props.language)}
            <span className={'file-upload-text-bold blue-underline'}>
              {' ' + getLanguageFromKey('form_filler.file_uploader_find', this.props.language)}
            </span>
          </p>
        </div>
        <div className='col text-center'>
          <p className={'file-upload-text'}>
            {getLanguageFromKey('form_filler.file_uploader_valid_file_format', this.props.language)}
            {this.props.hasCustomFileEndings ? (' ' + this.props.validFileEndings) :
              (' ' + getLanguageFromKey('form_filler.file_upload_valid_file_format_all', this.props.language))}
          </p>
        </div>
      </div>
    );
  }

  public renderAddMoreAttachmentsButton = (): JSX.Element => {
    if (this.props.displayMode === 'simple' && !this.state.showFileUpload &&
      (this.state.attachments.length < this.props.maxNumberOfAttachments) && this.state.attachments.length > 0) {
      return (
        <button className={'file-upload-button blue-underline'} onClick={this.showFileUpload}>
          {getLanguageFromKey('form_filler.file_uploader_add_attachment', this.props.language)}
        </button>
      );
    } else {
      return null;
    }
  }

  public showFileUpload = () => {
    this.setState({
      showFileUpload: true,
    });
  }

  public shouldShowFileUpload = (): boolean => {
    const { attachments, showFileUpload } = this.state;
    if (attachments.length >= this.props.maxNumberOfAttachments) {
      return false;
    } else {
      return (this.props.displayMode !== 'simple') || (attachments.length === 0) ||
        (showFileUpload === true);
    }
  }

  public render() {
    const validationMessages = this.getComponentValidations();
    const showFileUpload: boolean = this.shouldShowFileUpload();
    const hasValidationMessages: boolean = validationMessages.simpleBinding.errors.length > 0;
    return (
      <div className={'container'} id={'altinn-fileuploader-' + this.props.id}>
        {showFileUpload &&
          <div>
            <p className={'file-upload-text-bold-small'}>
              {
                getLanguageFromKey('form_filler.file_uploader_max_size', this.props.language)
                + ' ' + this.props.maxFileSizeInMB + ' ' +
                getLanguageFromKey('form_filler.file_uploader_mb', this.props.language)
              }
            </p>
            <DropZone
              onDrop={this.onDrop}
              maxSize={this.props.maxFileSizeInMB * bytesInOneMB} // mb to bytes
              disabled={this.props.readOnly}
              accept={(this.props.hasCustomFileEndings) ? this.props.validFileEndings : null}
            >
              {({ getRootProps, getInputProps, isDragActive, isDragAccept, isDragReject }) => {
                let styles = { ...baseStyle };
                styles = isDragActive ? { ...styles, ...activeStyle } : styles;
                styles = isDragReject ? { ...styles, ...rejectStyle } : styles;
                styles = (hasValidationMessages) ? { ...styles, ...validationErrorStyle } : styles;

                return (
                  <div
                    {...getRootProps()}
                    style={styles}
                    id={'altinn-drop-zone-' + this.props.id}
                    className={'file-upload' + (hasValidationMessages ? ' file-upload-invalid' : '')}
                  >
                    <input {...getInputProps()} />
                    {this.renderFileUploadContent()}
                  </div>
                );
              }}
            </DropZone>
          </div>
        }
        {this.renderFileList()}
        {this.renderAddMoreAttachmentsButton()}
        <p className={'file-upload-text-bold-small'}>
          {
            getLanguageFromKey('form_filler.file_uploader_number_of_files', this.props.language) + ' ' +
            (this.props.minNumberOfAttachments ? this.state.attachments.length + '/' + this.props.minNumberOfAttachments
              : this.state.attachments.length)
          }
        </p>
        {(validationMessages.simpleBinding.errors.length > 0) &&
          renderValidationMessagesForComponent(validationMessages.simpleBinding,
            this.props.id)
        }
      </div>
    );
  }
}

const mapStateToProps = (state: IRuntimeState, props: IFileUploadProvidedProps): IFileUploadProps => {
  return {
    ...props,
    attachments: state.attachments.attachments[props.id] || [],
  };
};

export function getFileUploadComponentValidations(validationError: string, language: any): IComponentValidations {
  const componentValidations: any = {
    ['simpleBinding']: {
      errors: [],
      warnings: [],
    },
  };
  if (validationError === 'upload') {
    componentValidations.simpleBinding.errors.push(
      getLanguageFromKey('form_filler.file_uploader_validation_error_upload', language),
    );
  } else if (validationError === 'delete') {
    componentValidations.simpleBinding.errors.push(
      getLanguageFromKey('form_filler.file_uploader_validation_error_delete', language),
    );
  }
  return componentValidations;
}

export const FileUploadComponent = connect(mapStateToProps)(FileUploadComponentClass);
