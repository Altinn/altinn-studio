import * as moment from 'moment';
import * as React from 'react';
import '../../styles/DatepickerComponent.css';
import '../../styles/shared.css';
import { Grid, useMediaQuery, useTheme, Icon, makeStyles } from '@material-ui/core';
import { KeyboardDatePicker, MuiPickersUtilsProvider } from '@material-ui/pickers';
import MomentUtils from '@date-io/moment';
import { getLanguageFromKey } from 'altinn-shared/utils';
import { AltinnAppTheme } from 'altinn-shared/theme';
import { Moment } from 'moment';
import { renderValidationMessagesForComponent } from '../../utils/render';
import { IComponentValidations, IComponentBindingValidation } from 'src/types/global';

export interface IDatePickerProps{
  id: string;
  readOnly: boolean;
  required: boolean;
  formData: any;
  handleDataChange: (value: any) => void;
  isValid?: boolean;
  format: string;
  minDate: string;
  maxDate: string;
  language: any;
  componentValidations: IComponentValidations;
}

const useStyles = makeStyles({
  root: {
    fontSize: '1.6rem',
    borderWidth:'2px',
    borderStyle: 'solid',
    marginBottom: '0px',
    borderColor: AltinnAppTheme.altinnPalette.primary.blueMedium,
    '&:hover': {
      borderColor: AltinnAppTheme.altinnPalette.primary.blueDark,
    },
    '&:focus-within': {
      outlineOffset: '0px',
      outline: '2px solid ' + AltinnAppTheme.altinnPalette.primary.blueDark,
    }
  },
  input: {
    marginLeft: '12px'
  },
  invalid: {
    borderColor: AltinnAppTheme.altinnPalette.primary.red + ' !important',
    outlineColor: AltinnAppTheme.altinnPalette.primary.red + ' !important',
  },
  icon: {
    // must be the same to center align icon
    fontSize: '30px',
    lineHeight: '30px'
  },
  formHelperText: {
    fontSize: '1.4rem',
  },
  datepicker: {
    width: 'auto',
    marginBottom: '0px',
    marginTop: '0px',
  }
});

class AltinnMomentUtils extends MomentUtils {
  getDatePickerHeaderText(date: Moment) {
    if (date && date.locale() == 'nb') {
      return date.format("ddd, D MMM");
    }
    else return super.getDatePickerHeaderText(date);
  }
}

function DatepickerComponent(props: IDatePickerProps) {
  const classes = useStyles();
  const [date, setDate] = React.useState<moment.Moment>(null);
  const [validDate, setValidDate] = React.useState<boolean>(true);
  const minDate = props.minDate ? props.minDate : "1900-01-01T12:00:00.000Z";
  const maxDate = props.maxDate ? props.maxDate : "2100-01-01T12:00:00.000Z";

  let locale = window.navigator?.language || (window.navigator as any)?.userLanguage || "nb-NO";
  moment.locale(locale);
  const theme = useTheme();
  const inline = useMediaQuery(theme.breakpoints.up('sm'));

  const mergeValidations = () => {
    // merges the internal state with the validation messages supplied from redux
    if (!props.componentValidations?.simpleBinding && validDate) {
      return {};
    }
    if (validDate) {
      return props.componentValidations.simpleBinding;
    }
    let validations: IComponentBindingValidation = props.componentValidations?.simpleBinding;
    if (!validations) {
      validations = {};
    } else {
      // deep copy
      validations = JSON.parse(JSON.stringify(props.componentValidations?.simpleBinding));
    }
    if (!validations.errors) {
      validations.errors = [];
    }
    if (date && date.isBefore(minDate)) {
      validations.errors.push(getLanguageFromKey('date_picker.min_date_exeeded', props.language));
    } else if (date && date.isAfter(maxDate)) {
      validations.errors.push(getLanguageFromKey('date_picker.max_date_exeeded', props.language));
    } else {
      validations.errors.push(getLanguageFromKey('date_picker.invalid_date_message', props.language));
    }
    return validations;
  }

  React.useEffect(() => {
    let date = props.formData ? moment(props.formData) : null;
    setDate(date);
  }, [props.formData]);

  const handleDataChangeWrapper = (date: moment.Moment) => {
    setDate(date);
    if (date && isValidDate(date)) {
      setValidDate(true);
      props.handleDataChange(date.toISOString());
    }
  }

  const isValidDate = (date: moment.Moment): boolean => {
    return date && date.isValid() && date.isAfter(minDate) && date.isBefore(maxDate);
  }

  const handleOnBlur = () => {
    if (!isValidDate(date)) {
      setValidDate(false);
      if (props.formData) {
        // if we have formdata, we need to update state. Otherwise not to avoid rerender.
        props.handleDataChange('');
      }
    } else {
      setValidDate(true);
      props.handleDataChange(date.toISOString());
    }
  }

  return (
    <>
      <MuiPickersUtilsProvider utils={AltinnMomentUtils}>
        <Grid
          container
          item
          xs={12}
        >
            <KeyboardDatePicker
              readOnly={props.readOnly}
              required={props.required}
              variant={inline ? 'inline' : 'dialog'}
              format={props.format}
              margin="normal"
              id={"altinn-date-picker-" + props.id}
              value={date}
              placeholder={props.format}
              key={"altinn-date-picker-" + props.id}
              onChange={handleDataChangeWrapper}
              onBlur={handleOnBlur}
              invalidDateMessage={''} // all validation messages intentionally left empty
              maxDateMessage={''}
              minDateMessage={''}
              minDate={minDate}
              maxDate={maxDate}
              cancelLabel={getLanguageFromKey('date_picker.cancel_label', props.language)}
              clearLabel={getLanguageFromKey('date_picker.clear_label', props.language)}
              todayLabel={getLanguageFromKey('date_picker.today_label', props.language)}
              InputProps={{
                disableUnderline: true,
                error: !props.isValid,
                classes: {
                  root: classes.root + ((!props.isValid || !validDate) ? ' ' + classes.invalid : ''),
                  input: classes.input,
                },
              }}
              FormHelperTextProps={{
                classes: {
                  root: classes.formHelperText
                }
              }}
              keyboardIcon={<Icon className={classes.icon + ' ai ai-date'}/>}
              className={classes.datepicker}
            />
          </Grid>
        </MuiPickersUtilsProvider>
        {renderValidationMessagesForComponent(mergeValidations(),`${props.id}_validations`)}
      </>

  )
}

export default DatepickerComponent;
