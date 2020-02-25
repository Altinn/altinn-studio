import * as moment from 'moment';
import * as React from 'react';
import '../../styles/DatepickerComponent.css';
import '../../styles/shared.css';
import { Grid } from '@material-ui/core';
import { KeyboardDatePicker, MuiPickersUtilsProvider } from '@material-ui/pickers';
import MomentUtils from '@date-io/moment';
import { getLanguageFromKey } from 'altinn-shared/utils';

export interface IDatePickerProps {
  id: string;
  readOnly: boolean;
  required: boolean;
  formData: any;
  handleDataChange: (value: any) => void;
  isValid?: boolean;
  format: string;
  language: any;
}

export function DatepickerComponent(props: IDatePickerProps) {

  const [date, setDate] = React.useState(null);

  React.useEffect(() => {
    let locale = window.navigator?.language || (window.navigator as any)?.userLanguage || "nb-NO";
    moment.locale(locale);
  });

  React.useEffect(() => {
    let date = props.formData ? moment(props.formData) : moment.now();
    setDate(date);
  }, [props.formData]);

  const handleDataChangeWrapper = (date: moment.Moment) => {
    setDate(date);
    if (date && date.isValid()) {
      props.handleDataChange(date.toISOString());
    }
  }

  const handleOnBlur = () => {
    props.handleDataChange(date ? date.toISOString() : '');
  }

  return (
    <MuiPickersUtilsProvider utils={MomentUtils}>
      <Grid
        container
        xs={12}
      >
          <KeyboardDatePicker
            readOnly={props.readOnly}
            required={props.required}
            variant="inline" // default to dialog => can use dialog on mobile devices?
            format={props.format}
            margin="normal"
            id={"altinn-date-picker-" + props.id}
            value={date}
            onChange={handleDataChangeWrapper}
            onBlur={handleOnBlur}
            invalidDateMessage={getLanguageFromKey('date_picker.invalid_date_message', props.language)}
            cancelLabel={getLanguageFromKey('date_picker.cancel_label', props.language)}
            clearLabel={getLanguageFromKey('date_picker.clear_label', props.language)}
            todayLabel={getLanguageFromKey('date_picker.today_label', props.language)}
            InputProps={{
              error: !props.isValid,
              style: {
                width: '100%'
              }
            }}
            style={{width: '100%'}}
          />
        </Grid>
      </MuiPickersUtilsProvider>
  )
}

export default DatepickerComponent;
