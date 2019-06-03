import classNames = require('classnames');
import * as React from 'react';
import '../../styles/shared.css';

export interface IInputProps {
  id: string;
  readOnly: boolean;
  required: boolean;
  formData: any;
  handleDataChange: (value: any) => void;
  isValid?: boolean;
  type?: string;
}

export interface IInputState {
  value: string;
}

export class InputComponent
  extends React.Component<IInputProps, IInputState> {

  constructor(_props: IInputProps, _state: IInputState) {
    super(_props, _state);
    this.state = {
      value: _props.formData ? _props.formData : '',
    };
  }

  public onDataChanged = (e: any) => {
    this.setState({
      value: e.target.value,
    });
  }

  public onDataChangeSubmit = () => {
    this.props.handleDataChange(this.state.value);
  }

  public render() {
    return (
      <input
        id={this.props.id}
        type={this.props.type}
        onBlur={this.onDataChangeSubmit}
        onChange={this.onDataChanged}
        disabled={this.props.readOnly}
        required={this.props.required}
        className={classNames('form-control',
          { 'validation-error': !this.props.isValid, 'disabled': this.props.readOnly },
        )}
        value={this.state.value}
      />
    );
  }
}
