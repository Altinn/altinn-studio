import moment from 'moment';
import * as React from 'react';
import '../../styles/DatepickerComponent.css';
import '../../styles/shared.css';
import { Grid, useMediaQuery, useTheme, Icon, makeStyles } from '@material-ui/core';
import { KeyboardDatePicker, MuiPickersUtilsProvider } from '@material-ui/pickers';
import MomentUtils from '@date-io/moment';
import { getLanguageFromKey } from 'altinn-shared/utils';
import { AltinnAppTheme } from 'altinn-shared/theme';
import { Moment } from 'moment';
import { IComponentValidations, IComponentBindingValidation } from 'src/types';
import { renderValidationMessagesForComponent } from '../../utils/render';
// eslint-disable-next-line import/no-cycle
import { validateDatepickerFormData } from '../../utils/validation';

export interface IDatePickerProps{
  id: string;
  readOnly: boolean;
  required: boolean;
  formData: any;
  handleDataChange: (value: any) => void;
  isValid?: boolean;
  timeStamp?: boolean;
  format: string;
  minDate: string;
  maxDate: string;
  language: any;
  componentValidations: IComponentValidations;
}

const useStyles = makeStyles({
  root: {
    fontSize: '1.6rem',
    borderWidth: '2px',
    borderStyle: 'solid',
    marginBottom: '0px',
    borderColor: AltinnAppTheme.altinnPalette.primary.blueMedium,
    '&:hover': {
      borderColor: AltinnAppTheme.altinnPalette.primary.blueDark,
    },
    '&:focus-within': {
      outlineOffset: '0px',
      outline: `2px solid ${AltinnAppTheme.altinnPalette.primary.blueDark}`,
    },
  },
  input: {
    marginLeft: '12px',
  },
  invalid: {
    borderColor: `${AltinnAppTheme.altinnPalette.primary.red} !important`,
    outlineColor: `${AltinnAppTheme.altinnPalette.primary.red} !important`,
  },
  icon: {
    // must be the same to center align icon
    fontSize: '30px',
    lineHeight: '30px',
  },
  formHelperText: {
    fontSize: '1.4rem',
  },
  datepicker: {
    width: 'auto',
    marginBottom: '0px',
    marginTop: '0px',
  },
});

class AltinnMomentUtils extends MomentUtils {
  getDatePickerHeaderText(date: Moment) {
    if (date && date.locale() === 'nb') {
      return date.format('ddd, D MMM');
    }
    return super.getDatePickerHeaderText(date);
  }
}

export const DatePickerMinDateDefault = '1900-01-01T12:00:00.000Z';
export const DatePickerMaxDateDefault = '2100-01-01T12:00:00.000Z';
export const DatePickerFormatDefault = 'DD.MM.YYYY';
export const DatePickerSaveFormatNoTimestamp = 'YYYY-MM-DD';

function DatepickerComponent(props: IDatePickerProps) {
  const classes = useStyles();
  const [date, setDate] = React.useState<moment.Moment>(null);
  const [validDate, setValidDate] = React.useState<boolean>(true);
  const [validationMessages, setValidationMessages] = React.useState<IComponentBindingValidation>(null);
  const minDate = props.minDate || DatePickerMinDateDefault;
  const maxDate = props.maxDate || DatePickerMaxDateDefault;
  const locale = window.navigator?.language || (window.navigator as any)?.userLanguage || 'nb-NO';
  moment.locale(locale);
  const format = moment.localeData().longDateFormat('L') || props.format || DatePickerFormatDefault;
  const theme = useTheme();
  const inline = useMediaQuery(theme.breakpoints.up('sm'));

  const isDateEmpty = () => {
    return date && date.parsingFlags().parsedDateParts.length === 0;
  };

  const getValidationMessages = () => {
    const checkDate = isDateEmpty() ? '' : date?.toISOString();
    const validations: IComponentBindingValidation =
      validateDatepickerFormData(checkDate, minDate, maxDate, format, props.language);
    const suppliedValidations = props.componentValidations?.simpleBinding;
    if (suppliedValidations?.errors) {
      suppliedValidations.errors.forEach((validation: string) => {
        if (validations.errors.indexOf(validation) === -1) {
          validations.errors.push(validation);
        }
      });
    }
    if (suppliedValidations?.warnings) {
      suppliedValidations.warnings.forEach((validation: string) => {
        if (validations.warnings.indexOf(validation) === -1) {
          validations.warnings.push(validation);
        }
      });
    }
    return validations;
  };

  React.useEffect(() => {
    const dateValue = props.formData ? moment(props.formData) : null;
    setDate(dateValue);
  }, [props.formData]);

  React.useEffect(() => {
    setValidationMessages(getValidationMessages());
  }, [props.formData, props.componentValidations]);

  const handleDataChangeWrapper = (dateValue: moment.Moment) => {
    dateValue?.set('hour', 12);
    dateValue?.set('minute', 0);
    setValidDate(true); // we reset valid date => show error onBlur or when user is done typing
    setValidationMessages({});
    if (dateValue && dateValue.isValid()) {
      const dateString = props.timeStamp === false ? dateValue.format(DatePickerSaveFormatNoTimestamp)
        : dateValue?.toISOString(true);
      setValidDate(isValidDate(dateValue)); // the date can have a valid format but not pass min/max validation
      if (isValidDate) {
        props.handleDataChange(dateString);
      }
    } else if (!dateValue) {
      setDate(null);
      setValidDate(true);
      props.handleDataChange('');
    }
  };

  const isValidDate = (dateValue: moment.Moment): boolean => {
    if (!dateValue) {
      return true;
    }
    return dateValue.isValid() && dateValue.isAfter(minDate) && dateValue.isBefore(maxDate);
  };

  const handleOnBlur = () => {
    if (date) {
      setValidDate(isValidDate(date));
    } else {
      setValidDate(true);
    }
    setValidationMessages(getValidationMessages());
    if (validDate) {
      const dateString = (props.timeStamp === false) ?
        date?.format(DatePickerSaveFormatNoTimestamp) : date?.toISOString(true);
      const saveDate = isDateEmpty() ? '' : dateString;
      props.handleDataChange(saveDate);
    }
  };

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
            format={format}
            margin='normal'
            id={props.id}
            value={date}
            placeholder={format}
            key={props.id}
            onChange={handleDataChangeWrapper}
            onBlur={handleOnBlur}
            autoOk={true}
            invalidDateMessage='' // all validation messages intentionally left empty
            maxDateMessage=''
            minDateMessage=''
            minDate={minDate}
            maxDate={maxDate}
            cancelLabel={getLanguageFromKey('date_picker.cancel_label', props.language)}
            clearLabel={getLanguageFromKey('date_picker.clear_label', props.language)}
            todayLabel={getLanguageFromKey('date_picker.today_label', props.language)}
            InputProps={{
              disableUnderline: true,
              'aria-describedby': `description-${props.id}`,
              error: (!props.isValid || !validDate),
              classes: {
                root: classes.root + ((validationMessages?.errors?.length || !validDate) ? ` ${classes.invalid}` : ''),
                input: classes.input,
              },
            }}
            FormHelperTextProps={{
              classes: {
                root: classes.formHelperText,
              },
            }}
            KeyboardButtonProps={{
              'aria-label': getLanguageFromKey('date_picker.aria_label_icon', props.language),
              id: 'date-icon-button',
            }}
            leftArrowButtonProps={{
              'aria-label': getLanguageFromKey('date_picker.aria_label_left_arrow', props.language),
              id: 'date-left-icon-button',
            }}
            rightArrowButtonProps={{
              'aria-label': getLanguageFromKey('date_picker.aria_label_right_arrow', props.language),
              id: 'date-right-icon-button',
            }}
            keyboardIcon={
              <Icon
                id='date-icon'
                className={`${classes.icon} ai ai-date`}
              />
            }
            className={classes.datepicker}
          />
        </Grid>
      </MuiPickersUtilsProvider>
      {renderValidationMessagesForComponent(validationMessages, `${props.id}_validations`)}
    </>
  );
}

export default DatepickerComponent;
