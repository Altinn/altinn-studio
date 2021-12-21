import FormControl from '@material-ui/core/FormControl';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Radio, { RadioProps } from '@material-ui/core/Radio';
import RadioGroup from '@material-ui/core/RadioGroup';
import { makeStyles } from '@material-ui/core/styles';
import * as React from 'react';
import { AltinnAppTheme } from 'altinn-shared/theme';
import { FormLabel } from '@material-ui/core';
import classNames from 'classnames';
import { renderValidationMessagesForComponent } from '../../utils/render';
import { useAppSelector } from 'src/common/hooks';
import { IComponentProps } from '..';

export interface IRadioButtonsContainerProps extends IComponentProps {
  validationMessages?: any;
  options: any[];
  optionsId: string;
  preselectedOptionIndex: number;
  title: string;
}

const useStyles = makeStyles({
  root: {
    '&:hover': {
      backgroundColor: 'transparent !important',
    },
  },
  icon: {
    borderRadius: '50%',
    border: '2px solid #1EAEF7',
    width: 24,
    height: 24,
    backgroundColor: '#ffffff',
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
    backgroundColor: '#ffffff',
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
    color: '#000000',
  },
  margin: {
    marginBottom: '1.2rem',
  },
});

export const RadioButtonContainerComponent = (
  props: IRadioButtonsContainerProps,
) => {
  const classes = useStyles(props);

  const [selected, setSelected] = React.useState('');
  const apiOptions = useAppSelector(state => state.optionState.options[props.optionsId]);
  const options = apiOptions || props.options || [];
  const radioGroupIsRow: boolean = options.length <= 2;

  React.useEffect(() => {
    returnSelected();
  }, [options]);

  React.useEffect(() => {
    returnSelected();
  }, [props.formData?.simpleBinding]);

  const returnSelected = () => {
    if (
      !props.formData?.simpleBinding &&
      props.preselectedOptionIndex >= 0 &&
      options &&
      props.preselectedOptionIndex < options.length
    ) {
      const preSelectedValue = options[props.preselectedOptionIndex].value;
      props.handleDataChange(preSelectedValue);
      setSelected(preSelectedValue);
    } else {
      setSelected(
        props.formData?.simpleBinding ?? '',
      );
    }
  };

  const onDataChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelected(event.target.value);
    props.handleFocusUpdate(props.id);
    props.handleDataChange(event.target.value);
  };

  const handleOnBlur = () => {
    props.handleDataChange(props.formData?.simpleBinding ?? '');
  };

  const RenderLegend = props.legend;

  return (
    <FormControl component='fieldset'>
      <FormLabel
        component='legend'
        classes={{ root: classNames(classes.legend) }}
      >
        <RenderLegend />
      </FormLabel>
      <RadioGroup
        aria-label={props.title}
        name={props.title}
        value={selected}
        onBlur={handleOnBlur}
        onChange={onDataChange}
        row={radioGroupIsRow}
        id={props.id}
      >
        {options.map((option: any, index: number) => (
          <React.Fragment key={index}>
            <FormControlLabel
              control={
                <StyledRadio
                  autoFocus={props.shouldFocus && selected === option.value}
                />
              }
              label={props.getTextResource(option.label)}
              value={option.value}
              classes={{ root: classNames(classes.margin) }}
            />
            {props.validationMessages &&
              selected === option.value &&
              renderValidationMessagesForComponent(
                props.validationMessages.simpleBinding,
                props.id,
              )}
          </React.Fragment>
        ))}
      </RadioGroup>
    </FormControl>
  );
};

const StyledRadio = (radioProps: RadioProps) => {
  const classes = useStyles(radioProps);
  return (
    <Radio
      className={classes.root}
      disableRipple={true}
      checkedIcon={
        <span className={classNames(classes.icon, classes.checkedIcon)} />
      }
      icon={<span className={classes.icon} />}
      {...radioProps}
    />
  );
};
