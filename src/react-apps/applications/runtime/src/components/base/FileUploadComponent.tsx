import * as React from 'react';
// import Dropzone from 'react-dropzone';
import Axios from 'axios';

export interface IFileUploadProps {
  id: string;
  component: IFormComponent;
  formData: any;
  handleDataChange: (value: any) => void;
  isValid?: boolean;
}

export interface IFileUploadState {
  title: string;
  component: string;
  description: string;
  files: any;
}

// const baseStyle = {
//   width: 200,
//   height: 200,
//   borderWidth: 2,
//   borderColor: '#666',
//   borderStyle: 'dashed',
//   borderRadius: 5,
// };
// const activeStyle = {
//   borderStyle: 'solid',
//   borderColor: '#6c6',
//   backgroundColor: '#eee',
// };
// const rejectStyle = {
//   borderStyle: 'solid',
//   borderColor: '#c66',
//   backgroundColor: '#eee',
// };

export class FileUploadComponent
  extends React.Component<IFileUploadProps, IFileUploadState> {

  public onDataChanged = (e: any) => {
    console.log('upload file,', e.target.files);
    const files: FileList = e.target.files;
    const altinnWindow: IAltinnWindow = window as IAltinnWindow;
    const { org, service, instanceId, reportee } = altinnWindow;
    const servicePath = `${org}/${service}`;
    const form = new FormData();
    // for (let index = 0; index < files.length; index++) {
    //   const element = files[index];
    //   form.append('file', element);
    // }
    form.append('file', files[0]);
    Axios.post(`${altinnWindow.location.origin}/runtime/api/${reportee}/${servicePath}/UploadAttachment/${instanceId}/${files[0].name}`, form);
    this.props.handleDataChange(e.target.value);
  }

  public onDrop = (acceptedFiles: any[], rejectedFiles: any) => {
    console.log('files:', acceptedFiles);
    this.setState({
      ...this.state,
      files: acceptedFiles,
    });

    if (!acceptedFiles || acceptedFiles.length === 0) {
      return;
    }

    const altinnWindow: IAltinnWindow = window as IAltinnWindow;
    const { org, service, reportee } = altinnWindow;
    const servicePath = `${org}/${service}`;

    acceptedFiles.forEach((file) => {
      Axios.post(`${altinnWindow.location.origin}/runtime/api/${reportee}/${servicePath}/UploadAttachment/${file.name}`, file);
    });

    
  }

  public render() {
    return (
      // <Dropzone onDrop={this.onDrop}>
      //   {({ getRootProps, getInputProps, isDragActive, isDragAccept, isDragReject, acceptedFiles, rejectedFiles}) => {
      //     let styles = {...baseStyle};
      //     styles = isDragActive ? {...styles, ...activeStyle} : styles;
      //     styles = isDragReject ? {...styles, ...rejectStyle} : styles;

      //     return(
      //       <div
      //         {...getRootProps()}
      //         style={styles}
      //       >
      //         <input {...getInputProps()} />
      //         <div>
      //           {isDragAccept ? 'Drop' : 'Drag'} files here...
      //         </div>
      //         {isDragReject && <div>Unsupported file type...</div>}
      //       </div>
      //     );
      //   }}
      // </Dropzone>
      <input type='file' onChange={this.onDataChanged} />
    );
  }
}
