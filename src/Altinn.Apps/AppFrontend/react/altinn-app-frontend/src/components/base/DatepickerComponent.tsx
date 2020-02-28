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

export interface IDatePickerProps{
  id: string;
  readOnly: boolean;
  required: boolean;
  formData: any;
  handleDataChange: (value: any) => void;
  isValid?: boolean;
  format: string;
  language: any;
}

const useStyles = makeStyles({
  root: {
    fontSize: '1.6rem',
    borderWidth:'2px',
    borderStyle: 'solid',
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

  let locale = window.navigator?.language || (window.navigator as any)?.userLanguage || "nb-NO";
  moment.locale(locale);
  const theme = useTheme();
  const inline = useMediaQuery(theme.breakpoints.up('sm'));

  React.useEffect(() => {
    let date = props.formData ? moment(props.formData) : null;
    setDate(date);
  }, [props.formData]);

  const handleDataChangeWrapper = (date: moment.Moment) => {
    setDate(date);
    if (date) {
      setValidDate(date.isValid());
    }
    if (date && date.isValid()) {
      props.handleDataChange(date.toISOString());
    }
  }

  const handleOnBlur = () => {
    props.handleDataChange(date ? date.toISOString() : '');
  }

  return (
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
            invalidDateMessage={getLanguageFromKey('date_picker.invalid_date_message', props.language)}
            maxDateMessage={getLanguageFromKey('date_picker.max_date_exeeded', props.language)}
            minDateMessage={getLanguageFromKey('date_picker.min_date_exeeded', props.language)}
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
            style={{
              width: 'auto',
            }}
          />
        </Grid>
      </MuiPickersUtilsProvider>
  )
}

export default DatepickerComponent;
