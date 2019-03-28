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
  formData: string;
}

export class TextAreaComponent
  extends React.Component<ITextAreaComponentProps, ITextAreaComponentState> {

  constructor(props: ITextAreaComponentProps, state: ITextAreaComponentState) {
    super(props, state);
    this.state = {
      formData: props.formData,
    };
  }

  public onDataChanged = (e: any) => {
    this.setState({
      formData: e.target.value,
    });
  }

  public onBlur = () => {
    this.props.handleDataChange(this.state.formData);
  }

  public render() {
    return (
      <div className={'a-form-group-items input-group p-0' + (this.props.component.readOnly ? ' disabled' : '')} >
        <textarea
          id={this.props.component.id}
          onBlur={this.onBlur}
          onChange={this.onDataChanged}
          disabled={this.props.component.readOnly}
          style={{ resize: 'none' }} // This is prone to change soon, implemented inline until then. See issue #1116
          className={(this.props.isValid ? 'form-control a-textarea ' : 'form-control validation-error')
            + (this.props.component.readOnly ? ' textarea-disabled' : '')}
          value={this.state.formData}
        />
      </div>
    );
  }
}
