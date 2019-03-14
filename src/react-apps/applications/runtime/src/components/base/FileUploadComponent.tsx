import * as React from 'react';
import DropZone from 'react-dropzone';
import altinnTheme from '../../../../shared/src/theme/altinnStudioTheme';
import { getLanguageFromKey } from '../../../../shared/src/utils/language';
import '../../styles/FileUploadComponent.css';

export interface IFileUploadProps {
  id: string;
  component: IFormFileUploaderComponent;
  formData: any;
  handleDataChange: (value: any) => void;
  isValid?: boolean;
  language: any;
}

export interface IAttachment {
  file: File;
  uploaded: boolean;
}

export interface IFileUploadState {
  title: string;
  component: string;
  description: string;
  attachments: IAttachment[];
  showFileUpload: boolean;
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
  borderColor: altinnTheme.altinnPalette.primary.blue,
};
const rejectStyle = {
  borderStyle: 'solid',
  borderColor: altinnTheme.altinnPalette.primary.red,
};

export class FileUploadComponent
  extends React.Component<IFileUploadProps, IFileUploadState> {

  constructor(props: IFileUploadProps, state: IFileUploadState) {
    super(props, state);
    this.state = {
      attachments: [],
      ...state,
    };
  }

  public onDataChanged = (e: any) => {
    this.props.handleDataChange(e.target.value);
  }

  public onDrop = (acceptedFiles: File[], rejectedFiles: File[]) => {
    const newFiles: IAttachment[] = [];
    acceptedFiles.forEach((file: File) => {
      newFiles.push({ file, uploaded: false });
    });
    this.setState({
      attachments: this.state.attachments.concat(newFiles),
      showFileUpload: (!(acceptedFiles.length > 0)), // if we added a file the uploader should be hidden in simple mode
    });
  }

  public handleDeleteFile = (event: any, index: number) => {
    const newArray = this.state.attachments.slice();
    newArray.splice(index, 1);
    this.setState({
      attachments: newArray,
    });
  }

  public renderFileList = (): JSX.Element => {
    if (!this.state.attachments || this.state.attachments.length === 0) {
      return null;
    }
    return (
      <div id={'altinn-file-list-' + this.props.id}>
        <table className={'file-upload-table'}>
          <thead>
            <tr className={'blue-underline'}>
              <th>{getLanguageFromKey('form_filler.file_uploader_list_header_name', this.props.language)}</th>
              <th>{getLanguageFromKey('form_filler.file_uploader_list_header_file_size', this.props.language)}</th>
              <th>{getLanguageFromKey('form_filler.file_uploader_list_header_status', this.props.language)}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {this.state.attachments.map((attachment: IAttachment, index: number) => {
              return (
                <tr key={index} className={'blue-underline-dotted'}>
                  <td>{attachment.file.name}</td>
                  <td>{attachment.file.size}</td>
                  <td>
                    {attachment.uploaded &&
                      getLanguageFromKey('form_filler.file_uploader_list_status_done', this.props.language)}
                    {!attachment.uploaded &&
                      <div className='a-loader'>
                        <div
                          className='loader loader-ellipsis'
                          style={{ marginLeft: '1.3rem', marginBottom: '1.6rem' }}
                        />
                      </div>}
                  </td>
                  <td>
                    <div onClick={this.handleDeleteFile.bind(this, index)}>
                      {getLanguageFromKey('form_filler.file_uploader_list_delete', this.props.language)}
                      <i className='ai ai-trash' />
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
    const { hasCustomFileEndings, validFileEndings } = this.props.component;
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
            {hasCustomFileEndings ? (' ' + validFileEndings) :
              (' ' + getLanguageFromKey('form_filler.file_upload_valid_file_format_all', this.props.language))}
          </p>
        </div>
      </div>
    );
  }

  public renderAddMoreAttachmentsButton = (): JSX.Element => {
    const { displayMode, maxNumberOfAttachments } = this.props.component;
    if (displayMode === 'simple' && this.state.attachments.length < maxNumberOfAttachments &&
      this.state.attachments.length > 0) {
      return (
        <button className={'file-upload-button blue-underline'} onClick={this.handleAddMoreAttachments}>
          {getLanguageFromKey('form_filler.file_uploader_add_attachment', this.props.language)}
        </button>
      );
    } else {
      return null;
    }
  }

  public handleAddMoreAttachments = () => {
    this.setState({
      showFileUpload: true,
    });
  }

  public render() {
    const { maxFileSizeInMB, disabled, validFileEndings, hasCustomFileEndings, displayMode } = this.props.component;
    const showFileUpload =
      (displayMode !== 'simple' || this.state.attachments.length === 0 || this.state.showFileUpload);
    return (
      <div className={'container'} id={'altinn-fileuploader-' + this.props.id}>
        {showFileUpload &&
          <div>
            <p className={'file-upload-text-bold-small'}>
              {
                getLanguageFromKey('form_filler.file_uploader_max_size', this.props.language)
                + ' ' + maxFileSizeInMB + ' ' +
                getLanguageFromKey('form_filler.file_uploader_mb', this.props.language)
              }
            </p>
            <DropZone
              onDrop={this.onDrop}
              maxSize={maxFileSizeInMB * 1000 * 1000} // mb to bytes
              disabled={disabled}
              accept={(hasCustomFileEndings) ? validFileEndings : null}
            >
              {({ getRootProps, getInputProps, isDragActive, isDragAccept, isDragReject }) => {
                let styles = { ...baseStyle };
                styles = isDragActive ? { ...styles, ...activeStyle } : styles;
                styles = isDragReject ? { ...styles, ...rejectStyle } : styles;

                return (
                  <div
                    {...getRootProps()}
                    style={styles}
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
      </div>
    );
  }
}
