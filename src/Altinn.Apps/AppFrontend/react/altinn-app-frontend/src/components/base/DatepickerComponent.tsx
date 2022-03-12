import moment from 'moment';
import * as React from 'react';
import {
  Grid,
  useMediaQuery,
  useTheme,
  Icon,
  makeStyles,
} from '@material-ui/core';
import {
  KeyboardDatePicker,
  MuiPickersUtilsProvider,
} from '@material-ui/pickers';
import MomentUtils from '@date-io/moment';
import { getLanguageFromKey } from 'altinn-shared/utils';
import { AltinnAppTheme } from 'altinn-shared/theme';
import { IComponentBindingValidation, DateFlags } from 'src/types';
import { getFlagBasedDate, getISOString } from '../../utils/dateHelpers';
import { renderValidationMessagesForComponent } from '../../utils/render';
import { validateDatepickerFormData } from '../../utils/validation';
import { IComponentProps } from '..';

import './DatepickerComponent.css';
import '../../styles/shared.css';

export interface IDatePickerProps extends IComponentProps {
  timeStamp?: boolean;
  format: string;
  minDate: string;
  maxDate: string;
}

const iconSize = '30px';

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
    fontSize: iconSize,
    lineHeight: iconSize,
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
  getDatePickerHeaderText(date: moment.Moment) {
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

// We dont use the built-in validation for the 3rd party component, so it is always empty string
const emptyString = '';

function DatepickerComponent({
  minDate,
  maxDate,
  format,
  language,
  componentValidations,
  formData,
  timeStamp = true,
  handleDataChange,
  readOnly,
  required,
  id,
  isValid,
}: IDatePickerProps) {
  const classes = useStyles();
  const [date, setDate] = React.useState<moment.Moment>(null);
  const [validDate, setValidDate] = React.useState<boolean>(true);
  const [validationMessages, setValidationMessages] =
    React.useState<IComponentBindingValidation>(null);
  const locale =
    window.navigator?.language ||
    (window.navigator as any)?.userLanguage ||
    'nb';
  moment.locale(locale);

  const calculatedMinDate =
    getFlagBasedDate(minDate as DateFlags) ||
    getISOString(minDate) ||
    DatePickerMinDateDefault;
  const calculatedMaxDate =
    getFlagBasedDate(maxDate as DateFlags) ||
    getISOString(maxDate) ||
    DatePickerMaxDateDefault;

  const calculatedFormat =
    moment.localeData().longDateFormat('L') ||
    format ||
    DatePickerFormatDefault;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const isDateEmpty = React.useCallback(() => {
    return date && date.parsingFlags().parsedDateParts.length === 0;
  }, [date]);

  const getValidationMessages = React.useCallback(() => {
    const checkDate = isDateEmpty() ? '' : date?.toISOString();
    const validations: IComponentBindingValidation = validateDatepickerFormData(
      checkDate,
      calculatedMinDate,
      calculatedMaxDate,
      calculatedFormat,
      language,
    );
    const suppliedValidations = componentValidations?.simpleBinding;
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
  }, [
    calculatedFormat,
    calculatedMinDate,
    calculatedMaxDate,
    language,
    componentValidations,
    date,
    isDateEmpty,
  ]);

  React.useEffect(() => {
    const dateValue = formData?.simpleBinding
      ? moment(formData.simpleBinding)
      : null;
    setDate(dateValue);
  }, [formData?.simpleBinding]);

  React.useEffect(() => {
    setValidationMessages(getValidationMessages());
  }, [getValidationMessages]);

  const handleDateChange = (dateValue: moment.Moment) => {
    dateValue
      ?.set('hour', 12)
      ?.set('minute', 0)
      ?.set('second', 0)
      ?.set('millisecond', 0);
    setValidDate(true); // we reset valid date => show error onBlur or when user is done typing
    setValidationMessages({});
    if (dateValue && dateValue.isValid()) {
      const dateString =
        timeStamp === true
          ? dateValue?.toISOString(true)
          : dateValue.format(DatePickerSaveFormatNoTimestamp);
      setValidDate(isValidDate(dateValue)); // the date can have a valid format but not pass min/max validation
      handleDataChange(dateString);
      setDate(dateValue);
    } else if (!dateValue) {
      setDate(null);
      setValidDate(true);
      handleDataChange('');
    }
  };

  const isValidDate = (dateValue: moment.Moment): boolean => {
    if (!dateValue) {
      return true;
    }
    dateValue
      .set('hour', 12)
      .set('minute', 0)
      .set('second', 0)
      .set('millisecond', 0);
    return (
      dateValue.isValid() &&
      dateValue.isSameOrAfter(calculatedMinDate) &&
      dateValue.isSameOrBefore(calculatedMaxDate)
    );
  };

  const handleBlur = () => {
    if (date) {
      setValidDate(isValidDate(date));
    } else {
      setValidDate(true);
    }
    setValidationMessages(getValidationMessages());
    if (validDate) {
      const dateString =
        timeStamp === false
          ? date?.format(DatePickerSaveFormatNoTimestamp)
          : date?.toISOString(true);
      const saveDate = isDateEmpty() ? '' : dateString;
      handleDataChange(saveDate);
    }
  };

  const mobileOnlyProps = isMobile
    ? {
        cancelLabel: getLanguageFromKey('date_picker.cancel_label', language),
        clearLabel: getLanguageFromKey('date_picker.clear_label', language),
        todayLabel: getLanguageFromKey('date_picker.today_label', language),
      }
    : {};

  return (
    <>
      <MuiPickersUtilsProvider utils={AltinnMomentUtils}>
        <Grid container item xs={12}>
          <KeyboardDatePicker
            readOnly={readOnly}
            required={required}
            variant={isMobile ? 'dialog' : 'inline'}
            format={calculatedFormat}
            margin='normal'
            id={id}
            value={date}
            placeholder={calculatedFormat}
            key={id}
            onChange={handleDateChange}
            onBlur={handleBlur}
            autoOk={true}
            invalidDateMessage={emptyString}
            maxDateMessage={emptyString}
            minDateMessage={emptyString}
            minDate={calculatedMinDate}
            maxDate={calculatedMaxDate}
            InputProps={{
              disableUnderline: true,
              'aria-describedby': `description-${id}`,
              error: !isValid || !validDate,
              readOnly: readOnly,
              classes: {
                root:
                  classes.root +
                  (validationMessages?.errors?.length || !validDate
                    ? ` ${classes.invalid}`
                    : '') +
                  (readOnly ? ' disabled' : ''),
                input: classes.input,
              },
            }}
            FormHelperTextProps={{
              classes: {
                root: classes.formHelperText,
              },
            }}
            KeyboardButtonProps={{
              'aria-label': getLanguageFromKey(
                'date_picker.aria_label_icon',
                language,
              ),
              id: 'date-icon-button',
            }}
            leftArrowButtonProps={{
              'aria-label': getLanguageFromKey(
                'date_picker.aria_label_left_arrow',
                language,
              ),
              id: 'date-left-icon-button',
            }}
            rightArrowButtonProps={{
              'aria-label': getLanguageFromKey(
                'date_picker.aria_label_right_arrow',
                language,
              ),
              id: 'date-right-icon-button',
            }}
            keyboardIcon={
              <Icon id='date-icon' className={`${classes.icon} ai ai-date`} />
            }
            className={classes.datepicker}
            {...mobileOnlyProps}
          />
        </Grid>
      </MuiPickersUtilsProvider>
      {renderValidationMessagesForComponent(
        validationMessages,
        `${id}_validations`,
      )}
    </>
  );
}

export default DatepickerComponent;
