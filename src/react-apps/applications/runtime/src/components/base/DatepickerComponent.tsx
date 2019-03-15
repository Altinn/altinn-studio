import * as React from 'react';
import '../../styles/InputComponent.css';

export interface IDatePickerProps {
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
  extends React.Component<IDatePickerProps, IDatePickerState> {

  constructor(_props: IDatePickerProps, _state: IDatePickerState) {
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

  public componentDidMount() {
    (window as any).initDatePicker();
  }

  public render() {
    return (
      <div className='form-group a-form-group a-form-group-datepicker'>
        <div className='input-group'>
          <input
            type='text'
            id={this.props.id}
            className={this.props.isValid ?
              'form-control a-hasButton date' :
              'form-control a-hasButton date validation-error'}
            onBlur={this.onDataChangeSubmit}
            onChange={this.onDataChanged}
            disabled={this.props.component.disabled}
            required={this.props.component.required}
            value={this.state.value}
          />
          <div className='input-group-prepend a-icon-right'>
            <i className='ai ai-date' />
          </div>
        </div>
      </div>
    );
  }
}
