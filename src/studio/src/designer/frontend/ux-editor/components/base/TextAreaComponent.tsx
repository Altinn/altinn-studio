import * as React from 'react';

export interface ITextAreaComponentProps {
  id: string;
  component: IFormComponent;
  formData: any;
  handleDataChange: (value: any) => void;
  isValid?: boolean;
}

export interface ITextAreaComponentState {
  title: string;
  component: string;
  name: string;
}

export class TextAreaComponent
  extends React.Component<ITextAreaComponentProps, ITextAreaComponentState> {

  public onDataChanged = (e: any) => {
    this.props.handleDataChange(e.target.value);
  }

  public render() {
    return (
      <textarea
        id={this.props.id}
        onBlur={this.onDataChanged}
        onChange={this.onDataChanged}
        className={this.props.isValid ? 'form-control a-textarea' : 'form-control a-textarea validation-error'}
        value={this.props.formData}
      />
    );
  }
}
