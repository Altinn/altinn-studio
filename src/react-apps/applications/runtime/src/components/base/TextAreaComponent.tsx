import * as React from 'react';
import '../../styles/shared.css';

export interface ITextAreaComponentProps {
  id: string;
  formData: any;
  handleDataChange: (value: any) => void;
  isValid?: boolean;
  readOnly: boolean;
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
      <div className={'a-form-group-items input-group p-0'} >
        <textarea
          id={this.props.id}
          onBlur={this.onBlur}
          onChange={this.onDataChanged}
          disabled={this.props.readOnly}
          style={{ resize: 'none' }} // This is prone to change soon, implemented inline until then. See issue #1116
          className={(this.props.isValid ? 'form-control a-textarea ' : 'form-control validation-error')
            + (this.props.readOnly ? ' disabled' : '')}
          value={this.state.formData}
        />
      </div>
    );
  }
}
