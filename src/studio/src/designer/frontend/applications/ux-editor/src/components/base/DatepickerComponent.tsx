import * as React from 'react';
import '../../styles/InputComponent.css';

export interface IDatepickerProps {
  id: string;
  component: IFormComponent;
  formData: any;
  handleDataChange: (value: any) => void;
  isValid?: boolean;
}

export interface IDatePickerState {
  value: string;
}

export class DatepickerComponent
  extends React.Component<IDatepickerProps, IDatePickerState> {

  constructor(_props: IDatepickerProps, _state: IDatePickerState) {
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
        type={this.props.component.type}
        onBlur={this.onDataChangeSubmit}
        onChange={this.onDataChanged}
        disabled={this.props.component.disabled}
        required={this.props.component.required}
        className={this.props.isValid ? 'form-control' : 'form-control validation-error'}
        value={this.state.value}
      />
    );
  }
}
