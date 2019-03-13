import * as React from 'react';
import DropZone from 'react-dropzone';
import altinnTheme from '../../../../shared/src/theme/altinnStudioTheme';
import '../../styles/FileUploadComponent.css';

export interface IFileUploadProps {
  id: string;
  component: IFormFileUploaderComponent;
  formData: any;
  handleDataChange: (value: any) => void;
  isValid?: boolean;
}

export interface IFileUploadState {
  title: string;
  component: string;
  description: string;
  files: File[];
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
      files: [],
      ...state,
    };
  }

  public onDataChanged = (e: any) => {
    this.props.handleDataChange(e.target.value);
  }

  public onDrop = (acceptedFiles: File[], rejectedFiles: File[]) => {
    this.setState({
      files: this.state.files.concat(acceptedFiles),
    });
  }

  public handleDeleteFile = (event: any, index: number) => {
    const newArray = this.state.files.slice();
    newArray.splice(index, 1);
    this.setState({
      files: newArray,
    });
  }

  public renderFileList = (): JSX.Element => {
    if (!this.state.files || this.state.files.length === 0) {
      return null;
    }
    return (
      <div id={'altinn-file-list-' + this.props.id}>
        <table className={'file-upload-table'} cellSpacing={12}>
          <thead className={'file-upload-table-header'}>
            <tr className={'blue-underline'}>
              <th>Navn</th>
              <th>Filstørrelse</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody className={'file-upload-table-body'}>
            {this.state.files.map((file: File, index: number) => {
              return (
                <tr key={index} className={'blue-underline-dotted'}>
                  <td>{file.name}</td>
                  <td>{file.size}</td>
                  <td>Opplastet</td>
                  <td className={'file-upload-table-last-item cursor-pointer'} >
                    <div onClick={this.handleDeleteFile.bind(this, index)}>
                      Slett vedlegg <i className='ai ai-trash' />
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
          <span className='sr-only a-fontSize'>Upload icon</span>
        </div>
        <div className='col text-center'>
          <p className={'file-upload-text-bold'}>Dra og slipp eller
            <span className={'file-upload-text-bold blue-underline'}> let etter fil</span>
          </p>
        </div>
        <div className='col text-center'>
          <p className={'file-upload-text'}>
            Tillate filformater er: {hasCustomFileEndings ? validFileEndings : 'alle'}
          </p>
        </div>
      </div>
    );
  }

  public renderAddMoreAttachmentsButton = (): JSX.Element => {
    const { displayMode, maxNumberOfAttachments } = this.props.component;
    // TODO: CHANGE TO EQUALS
    if (displayMode !== 'simple' && this.state.files.length < maxNumberOfAttachments) {
      return (
        <button className={'a-btn a-btn-link'} onClick={this.handleAddMoreAttachments}>Legg til flere vedlegg</button>
      );
    } else {
      return null;
    }
  }

  public handleAddMoreAttachments = () => {
    // TODO: SHOW FILEUPLOADER
  }

  public render() {
    const { maxFileSizeInMB, disabled, validFileEndings, hasCustomFileEndings } = this.props.component;
    return (
      <div className={'container'} id={'altinn-fileuploader-' + this.props.id}>
        <div>
          <p className={'file-upload-text-bold-small'}>{'Maks filestørrelse ' + maxFileSizeInMB + ' MB'}</p>
          <DropZone
            onDrop={this.onDrop}
            maxSize={maxFileSizeInMB * 1000}
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
        {this.renderAddMoreAttachmentsButton()}
        {this.renderFileList()}
      </div>
    );
  }
}
