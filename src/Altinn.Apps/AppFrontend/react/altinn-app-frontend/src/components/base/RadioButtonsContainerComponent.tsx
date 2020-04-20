import FormControl from '@material-ui/core/FormControl';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Radio, { RadioProps } from '@material-ui/core/Radio';
import RadioGroup from '@material-ui/core/RadioGroup';
import { makeStyles } from '@material-ui/core/styles';
import classNames = require('classnames');
import * as React from 'react';
import {AltinnAppTheme} from 'altinn-shared/theme';
import { renderValidationMessagesForComponent } from '../../utils/render';
import { FormLabel } from '@material-ui/core';

export interface IRadioButtonsContainerProps {
  id: string;
  formData: any;
  handleDataChange: (value: any) => void;
  handleFocusUpdate: (value: any) => void;
  validationMessages?: any;
  options: any[];
  preselectedOptionIndex: number;
  shouldFocus: boolean;
  title: string;
  legend: () => JSX.Element;
}

const useStyles = makeStyles({
  root: {
    '&:hover': {
      backgroundColor: 'transparent !important',
    },
  },
  icon: {
    'borderRadius': '50%',
    'border': '2px solid #1EAEF7',
    'width': 24,
    'height': 24,
    'backgroundColor': '#ffffff',
    '$root.Mui-focusVisible &': {
      outline: '2px solid #ff0000',
      outlineOffset: 0,
      outlineColor: AltinnAppTheme.altinnPalette.primary.blueDark,
    },
    'input:hover ~ &': {
      borderColor: AltinnAppTheme.altinnPalette.primary.blueDark,
    },
    'input:disabled ~ &': {
      boxShadow: 'none',
      background: 'rgba(206,217,224,.5)',
    },
  },
  checkedIcon: {
    'backgroundColor': '#ffffff',
    '&:before': {
      display: 'block',
      width: 20,
      height: 20,
      backgroundImage: 'radial-gradient(#000,#000 30%,transparent 40%)',
      content: '""',
    },
    'input:hover ~ &': {
      borderColor: AltinnAppTheme.altinnPalette.primary.blueDark,
    },
  },
  legend: {
    'color': '#000000',
  }
});

export const RadioButtonContainerComponent = (props: IRadioButtonsContainerProps) => {
  const classes = useStyles(props);

  const [selected, setSelected] = React.useState('');
  const radioGroupIsRow: boolean = (props.options.length <= 2);

  React.useEffect(() => {
    returnSelected();
  }, [props.formData]);

  const returnSelected = () => {
    if (
      !props.formData &&
      props.preselectedOptionIndex &&
      props.options &&
      props.preselectedOptionIndex < props.options.length
    ) {
      const preselectedValue = props.options[props.preselectedOptionIndex].value;
      setSelected(preselectedValue);
    } else {
      setSelected(props.formData ? props.formData : '');
    }
  };

  const StyledRadio = (radioProps: RadioProps) => {
    return (
      <Radio
        className={classes.root}
        disableRipple={true}
        checkedIcon={<span className={classNames(classes.icon, classes.checkedIcon)} />}
        icon={<span className={classes.icon} />}
        {...radioProps}
      />
    );
  };

  const onDataChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelected(event.target.value);
    props.handleFocusUpdate(props.id);
    props.handleDataChange(event.target.value);
  };

  const RenderLegend = props.legend;

  return (
    <FormControl component={'fieldset'}>
      <FormLabel
        component={'legend'}
        classes={{root: classNames(classes.legend)}}  
      >
        <RenderLegend />
      </FormLabel>
      <RadioGroup
        aria-label={props.title}
        name={props.title}
        value={selected}
        onChange={onDataChange}
        row={radioGroupIsRow}
        id={props.id}
      >
        {props.options.map((option: any, index: number) => (
          <React.Fragment key={index}>
            <FormControlLabel
              control={<StyledRadio autoFocus={props.shouldFocus && selected === option.value}/>}
              label={option.label}
              value={option.value}
            />
            {props.validationMessages && (selected === option.value) &&
              renderValidationMessagesForComponent(props.validationMessages.simpleBinding, props.id)}
          </React.Fragment>
        ))}
      </RadioGroup>
    </FormControl>
  );
};
