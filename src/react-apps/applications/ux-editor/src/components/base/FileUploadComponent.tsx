import * as React from 'react';

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
}

export class FileUploadComponent
  extends React.Component<IFileUploadProps, IFileUploadState> {

  public onDataChanged = (e: any) => {
    this.props.handleDataChange(e.target.value);
  }

  public render() {
    const { description } = this.props.component;
    return (
      <div className='js-attachmentForm'>
        <label className='a-btn a-btn-action a-iconRight a-custom-fileupload mb-0 mt-1 a-js-uploadAttachment'>
          <input
            id={this.props.id}
            type='file'
            name='file'
            onChange={this.onDataChanged}
            className={this.props.isValid ? 'a-js-certificateContainer sr-only' : 'a-js-certificateContainer sr-only validation-error'}
          />
          Add a file
          {description}
          <i className='ai ai-upload' />
        </label>
      </div>
    );
  }
}
