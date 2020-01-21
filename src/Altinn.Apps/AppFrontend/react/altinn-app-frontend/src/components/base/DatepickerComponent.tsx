import * as moment from 'moment';
import * as React from 'react';
import { createRef } from 'react';
import '../../styles/DatepickerComponent.css';
import '../../styles/shared.css';
import { returnDatestringFromDate } from 'altinn-shared/utils';

export interface IDatePickerProps {
  id: string;
  readOnly: boolean;
  required: boolean;
  formData: any;
  handleDataChange: (value: any) => void;
  isValid?: boolean;
}

export interface IDatePickerState {
  value: string;
  isChanged: boolean;
}

export class DatepickerComponent extends React.Component<IDatePickerProps, IDatePickerState> {
  private datePickerRef = createRef<HTMLInputElement>();
  constructor(_props: IDatePickerProps, _state: IDatePickerState) {
    super(_props, _state);
    this.state = {
      value: _props.formData ? moment(_props.formData).format('DD.MM.YYYY') : '',
      isChanged: false,
    };
  }

  public onDateChange = () => {
    this.setState({
      value: this.datePickerRef.current.value,
      isChanged: true,
    });
  }

  public onDateBlur = () => {
    setTimeout(() => {
      if (this.state.value === this.datePickerRef.current.value && !this.state.isChanged) {
        return;
      } else {
        this.setState({
          value: this.datePickerRef.current.value,
          isChanged: false,
        });
        this.props.handleDataChange(returnDatestringFromDate(this.datePickerRef.current.value, 'DD.MM.YYYY'));
      }
    }, 200);
  }

  public componentDidMount() {
    // TODO: dateFormat and dateLanguage should be retrieved from either datamodel, formlayout or user language.
    const dateFormat = 'dd.mm.yyyy';
    const dateLanguage = 'no';
    if (!this.props.readOnly) {
      (window as any).initDatePicker(this.props.id, dateFormat, dateLanguage);
    }
  }

  public render() {
    return (
      <div className='form-group a-form-group a-form-group-datepicker' style={{ marginBottom: '0' }}>
        <div className={'input-group' + (this.props.readOnly ? ' disabled' : '')}>
          <input
            type='text'
            id={this.props.id}
            className={(this.props.readOnly ? 'disabled-date ' : '') +
              (this.props.isValid ?
                'form-control a-hasButton date' :
                'form-control a-hasButton date validation-error')}
            onBlur={this.onDateBlur}
            onChange={this.onDateChange}
            readOnly={this.props.readOnly}
            required={this.props.required}
            value={this.state.value}
            ref={this.datePickerRef}
          />
          <div className={'input-group-prepend a-icon-right' + (this.props.readOnly ? ' disabled-date' : '')}>
            <i className='ai ai-date' />
          </div>
        </div>
      </div>
    );
  }
}
