import * as React from 'react';
import '../../styles/TextAreaComponent.css';

export interface ITextAreaComponentProps {
  id: string;
  component: IFormTextAreaComponent;
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
      <div className={'a-form-group-items input-group p-0' + (this.props.component.readOnly ? ' disabled' : '')} >
        <textarea
          id={this.props.id}
          onBlur={this.onDataChanged}
          disabled={this.props.component.readOnly}
          className={(this.props.isValid ? 'form-control a-textarea' : 'form-control validation-error')
            + (this.props.component.readOnly ? ' textarea-disabled' : '')}
          value={this.props.formData}
        />
      </div>
    );
  }
}
