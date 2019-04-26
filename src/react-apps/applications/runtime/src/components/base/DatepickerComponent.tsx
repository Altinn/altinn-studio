import * as React from 'react';
import { createRef } from 'react';
import '../../styles/shared.css';

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

  private datePickerRef = createRef<HTMLInputElement>();

  constructor(_props: IDatePickerProps, _state: IDatePickerState) {
    super(_props, _state);
    this.state = {
      value: _props.formData ? _props.formData : '',
    };
  }

  public onDateChange = (e: any) => {
    this.setState({
      value: e.target.value,
    });
  }

  public ondateBlur = () => {
    setTimeout(() => {
      if (!this.datePickerRef.current.value || this.state.value === this.datePickerRef.current.value) {
        return;
      }
      this.setState({
        value: this.datePickerRef.current.value,
      });
      this.props.handleDataChange(this.state.value);
    }, 200);
  }

  public componentDidMount() {
    // TODO: dateFormat and dateLanguage should be retrieved from either datamodel, formlayout or user language.
    const dateFormat = 'dd.mm.yyyy';
    const dateLanguage = 'no';
    (window as any).initDatePicker(this.props.id, dateFormat, dateLanguage);
  }

  public render() {
    return (
      <div className='form-group a-form-group a-form-group-datepicker'>
        <div className={'input-group' + (this.props.component.readOnly ? ' disabled' : '')}>
          <input
            type='text'
            id={this.props.id}
            className={(this.props.component.readOnly ? 'disabled-date ' : '') +
              (this.props.isValid ?
                'form-control a-hasButton date' :
                'form-control a-hasButton date validation-error')}
            onBlur={this.ondateBlur}
            onChange={this.onDateChange}
            disabled={this.props.component.readOnly}
            required={this.props.component.required}
            value={this.state.value}
            ref={this.datePickerRef}
          />
          <div className={'input-group-prepend a-icon-right' + (this.props.component.readOnly ? ' disabled-date' : '')}>
            <i className='ai ai-date' />
          </div>
        </div>
      </div>
    );
  }
}
