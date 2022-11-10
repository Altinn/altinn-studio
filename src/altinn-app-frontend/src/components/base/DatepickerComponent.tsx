import * as React from 'react';

import MomentUtils from '@date-io/moment';
import { Grid, Icon, makeStyles, useMediaQuery, useTheme } from '@material-ui/core';
import { KeyboardDatePicker, MuiPickersUtilsProvider } from '@material-ui/pickers';
import moment from 'moment';
import type { MaterialUiPickersDate } from '@material-ui/pickers/typings/date';

import { useDelayedSavedState } from 'src/components/hooks/useDelayedSavedState';
import { getDateConstraint, getDateFormat, getDateString } from 'src/utils/dateHelpers';
import type { PropsFromGenericComponent } from 'src/components';

import { getLanguageFromKey } from 'altinn-shared/utils';

import 'src/components/base/DatepickerComponent.css';
import 'src/styles/shared.css';

export type IDatePickerProps = PropsFromGenericComponent<'DatePicker'>;

const iconSize = '30px';

const useStyles = makeStyles((theme) => ({
  root: {
    boxSizing: 'border-box',
    height: '36px',
    fontSize: '1.6rem',
    borderWidth: '2px',
    borderStyle: 'solid',
    marginBottom: '0px',
    borderColor: theme.altinnPalette.primary.blueMedium,
    '&:hover': {
      borderColor: theme.altinnPalette.primary.blueDark,
    },
    '&:focus-within': {
      outlineOffset: '0px',
      outline: `2px solid ${theme.altinnPalette.primary.blueDark}`,
    },
  },
  input: {
    padding: '0px',
    marginLeft: '12px',
  },
  invalid: {
    borderColor: `${theme.altinnPalette.primary.red} !important`,
    outlineColor: `${theme.altinnPalette.primary.red} !important`,
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
}));

class AltinnMomentUtils extends MomentUtils {
  getDatePickerHeaderText(date: moment.Moment) {
    if (date && date.locale() === 'nb') {
      return date.format('ddd, D MMM');
    }
    return super.getDatePickerHeaderText(date);
  }
}

// We dont use the built-in validation for the 3rd party component, so it is always empty string
const emptyString = '';

function DatepickerComponent({
  minDate,
  maxDate,
  format,
  language,
  formData,
  timeStamp = true,
  handleDataChange,
  readOnly,
  required,
  id,
  isValid,
  textResourceBindings,
}: IDatePickerProps) {
  const classes = useStyles();

  const calculatedMinDate = getDateConstraint(minDate, 'min');
  const calculatedMaxDate = getDateConstraint(maxDate, 'max');

  const calculatedFormat = getDateFormat(format);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const { value, setValue, saveValue, onPaste } = useDelayedSavedState(handleDataChange, formData?.simpleBinding ?? '');

  const dateValue = moment(value, moment.ISO_8601);
  const [date, input] = dateValue.isValid() ? [dateValue, undefined] : [null, value ?? ''];

  const handleDateValueChange = (
    dateValue: MaterialUiPickersDate,
    inputValue: string | undefined,
    saveImmediately = false,
  ) => {
    if (dateValue?.isValid()) {
      dateValue.set('hour', 12).set('minute', 0).set('second', 0).set('millisecond', 0);
      setValue(getDateString(dateValue, timeStamp), saveImmediately);
    } else {
      const skipValidation = (dateValue?.parsingFlags().charsLeftOver ?? 0) > 0;
      setValue(inputValue ?? '', saveImmediately, skipValidation);
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
        <Grid
          container
          item
          xs={12}
        >
          <KeyboardDatePicker
            readOnly={readOnly}
            required={required}
            variant={isMobile ? 'dialog' : 'inline'}
            format={calculatedFormat}
            margin='normal'
            id={id}
            data-testid={id}
            value={date}
            inputValue={input}
            placeholder={calculatedFormat}
            key={id}
            onChange={handleDateValueChange}
            onBlur={saveValue}
            onAccept={(dateValue) => handleDateValueChange(dateValue, undefined, true)}
            onPaste={onPaste}
            autoOk={true}
            invalidDateMessage={emptyString}
            maxDateMessage={emptyString}
            minDateMessage={emptyString}
            minDate={calculatedMinDate}
            maxDate={calculatedMaxDate}
            InputProps={{
              disableUnderline: true,
              error: !isValid,
              readOnly: readOnly,
              classes: {
                root: classes.root + (!isValid ? ` ${classes.invalid}` : '') + (readOnly ? ' disabled' : ''),
                input: classes.input,
              },
              ...(textResourceBindings?.description && {
                'aria-describedby': `description-${id}`,
              }),
            }}
            FormHelperTextProps={{
              classes: {
                root: classes.formHelperText,
              },
            }}
            KeyboardButtonProps={{
              'aria-label': getLanguageFromKey('date_picker.aria_label_icon', language),
              id: 'date-icon-button',
            }}
            leftArrowButtonProps={{
              'aria-label': getLanguageFromKey('date_picker.aria_label_left_arrow', language),
              id: 'date-left-icon-button',
            }}
            rightArrowButtonProps={{
              'aria-label': getLanguageFromKey('date_picker.aria_label_right_arrow', language),
              id: 'date-right-icon-button',
            }}
            keyboardIcon={
              <Icon
                id='date-icon'
                className={`${classes.icon} ai ai-date`}
              />
            }
            className={classes.datepicker}
            {...mobileOnlyProps}
          />
        </Grid>
      </MuiPickersUtilsProvider>
    </>
  );
}

export default DatepickerComponent;
