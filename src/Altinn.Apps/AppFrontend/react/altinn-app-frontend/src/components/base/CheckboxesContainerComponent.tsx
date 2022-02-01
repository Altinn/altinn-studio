import { FormControlLabel, FormGroup, FormLabel } from '@material-ui/core';
import Checkbox, { CheckboxProps } from '@material-ui/core/Checkbox';
import FormControl from '@material-ui/core/FormControl';
import { makeStyles } from '@material-ui/core/styles';
import * as React from 'react';
import { AltinnAppTheme } from 'altinn-shared/theme';
import classNames from 'classnames';
import { renderValidationMessagesForComponent } from '../../utils/render';
import { useAppSelector } from 'src/common/hooks';
import { IComponentProps } from '..';
import { IOption } from 'src/types';

export interface ICheckboxContainerProps extends IComponentProps {
  validationMessages: any;
  options: IOption[];
  optionsId: string;
  preselectedOptionIndex?: number;
}

export interface IStyledCheckboxProps extends CheckboxProps {
  label: string;
}

const useStyles = makeStyles({
  root: {
    '&:hover': {
      backgroundColor: 'transparent',
    },
  },
  icon: {
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

      backgroundImage:
        "url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3E%3Cpath fill='%23000000' d='M6.564.75l-3.59 3.612-1.538-1.55L0 4.26 2.974 7.25 8 2.193z'/%3E%3C/svg%3E\")",
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


const emptyList: undefined[] = []; // constant for reference stability

export const CheckboxContainerComponent = (props: ICheckboxContainerProps) => {
  const {
    handleDataChange,
    preselectedOptionIndex
  } = props;
  const classes = useStyles(props);
  const apiOptions: IOption[] = useAppSelector(state => state.optionState.options[props.optionsId]);
  const options = apiOptions || props.options || emptyList;
  const checkBoxesIsRow: boolean = options.length <= 2;

  const selected = React.useMemo(() => {
    return props.formData.simpleBinding.split(',').map(v => options.find(o => o.value == v)).filter(o => !!o) ?? emptyList;
  }, [props.formData, options])

  // Implement preselected functionality
  const preselectedOptionSet = React.useRef(false);
  React.useEffect(() => {
    const preselectedOption = options?.[preselectedOptionIndex]?.value;
    if (
      !selected &&
      preselectedOption &&
      !preselectedOptionSet.current
    ) {
      preselectedOptionSet.current = true; //only rune once when ready
      handleDataChange(preselectedOption);
    }
  }, [options, handleDataChange, selected, preselectedOptionIndex, preselectedOptionSet]);



  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const previouslySelected = selected.some(v => v.value === event.target.name);

    const newSelected = previouslySelected ?
      selected.filter(o => o.value !== event.target.name) :
      [...selected, options.find(o => o.value === event.target.name)];
    props.handleDataChange(newSelected.map(o => o.value).join());
    props.handleFocusUpdate(props.id);
  };

  const isOptionSelected = (option: IOption) => {
    return selected.some(o => o.value === option.value);
  };

  const RenderLegend = props.legend;

  return (
    <FormControl key={`checkboxes_control_${props.id}`} component='fieldset'>
      <FormLabel
        component='legend'
        classes={{ root: classNames(classes.legend) }}
      >
        <RenderLegend />
      </FormLabel>
      <FormGroup
        row={checkBoxesIsRow}
        id={props.id}
        key={`checkboxes_group_${props.id}`}
      >
        {options.map((option, index) => (
          <React.Fragment key={option.value}>
            <FormControlLabel
              key={option.value}
              classes={{ root: classNames(classes.margin) }}
              control={
                <StyledCheckbox
                  checked={isOptionSelected(option)}
                  onChange={handleChange}
                  value={index}
                  key={option.value}
                  name={option.value}
                  label={props.getTextResourceAsString(option.label)}
                />
              }
              label={props.getTextResource(option.label)}
            />
            {props.validationMessages &&
              isOptionSelected(option) &&
              renderValidationMessagesForComponent(
                props.validationMessages.simpleBinding,
                props.id,
              )}
          </React.Fragment>
        ))}
      </FormGroup>
    </FormControl>
  );
};

const StyledCheckbox = (styledCheckboxProps: IStyledCheckboxProps) => {
  const { label, ...checkboxProps } = styledCheckboxProps;
  const classes = useStyles(styledCheckboxProps);

  return (
    <Checkbox
      className={classes.root}
      disableRipple={true}
      color='default'
      checkedIcon={
        <span className={classNames(classes.icon, classes.checkedIcon)} />
      }
      icon={<span className={classes.icon} />}
      inputProps={{ 'aria-label': label }}
      {...checkboxProps}
    />
  );
};
