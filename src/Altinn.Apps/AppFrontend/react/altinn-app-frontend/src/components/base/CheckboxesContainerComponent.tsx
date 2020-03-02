import { FormControlLabel, FormGroup } from '@material-ui/core';
import Checkbox, { CheckboxProps } from '@material-ui/core/Checkbox';
import FormControl from '@material-ui/core/FormControl';
import { makeStyles } from '@material-ui/core/styles';
import classNames = require('classnames');
import * as React from 'react';
import {AltinnAppTheme} from 'altinn-shared/theme';
import { renderValidationMessagesForComponent } from '../../utils/render';

export interface ICheckboxContainerProps {
  id: string;
  formData: any;
  handleDataChange: (value: any) => void;
  handleFocusUpdate: (value: any) => void;
  isValid: boolean;
  validationMessages: any;
  options: any[];
  preselectedOptionIndex: number;
  readOnly: boolean;
  shouldFocus: boolean;
}

const useStyles = makeStyles({
  root: {
    '&:hover': {
      backgroundColor: 'transparent',
    },
  },
  icon: {
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
      // tslint:disable-next-line: max-line-length
      backgroundImage: "url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3E%3Cpath fill='%23000000' d='M6.564.75l-3.59 3.612-1.538-1.55L0 4.26 2.974 7.25 8 2.193z'/%3E%3C/svg%3E\")",
      content: '""',
    },
    'input:hover ~ &': {
      borderColor: AltinnAppTheme.altinnPalette.primary.blueDark,
    },
  },
});

export const CheckboxContainerComponent = (props: ICheckboxContainerProps) => {
  const classes = useStyles(props);

  const [selected, setSelected] = React.useState([]);
  const checkBoxesIsRow: boolean = (props.options.length <= 2);

  React.useEffect(() => {
    returnState();
  }, [props.formData]);

  const returnState = () => {
    if (
      !props.formData &&
      props.preselectedOptionIndex &&
      props.options &&
      props.preselectedOptionIndex < props.options.length
    ) {
      const preSelected: string[] = [];
      preSelected[props.preselectedOptionIndex] = props.options[props.preselectedOptionIndex].value;
      setSelected(preSelected);
    } else {
      setSelected(props.formData ? props.formData.split(',') : []);
    }
  };

  const onDataChanged = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newSelected: any = selected;

    if (newSelected[event.target.value] === event.target.name) {
      newSelected[event.target.value] = '';
    } else {
      newSelected[event.target.value] = event.target.name;
    }

    setSelected(newSelected);
    props.handleDataChange(selectedHasValues(newSelected) ? newSelected.join() : '');
  };

  const selectedHasValues = (select: string[]): boolean => {
    return select.some((element) => element !== '');
  };

  const isOptionSelected = (option: string) => {
    return selected.indexOf(option) > -1;
  };

  const StyledCheckbox = (checkboxProps: CheckboxProps) => {
    return (
      <Checkbox
        className={classes.root}
        disableRipple={true}
        color='default'
        checkedIcon={<span className={classNames(classes.icon, classes.checkedIcon)} />}
        icon={<span className={classes.icon} />}
        inputProps={{ 'aria-label': 'decorative checkbox' }}
        {...checkboxProps}
      />
    );
  };

  return(
    <FormControl>
      <FormGroup row={checkBoxesIsRow}>
        {props.options.map((option, index) => (
          <React.Fragment key={index}>
            <FormControlLabel
              key={index}
              control={(
                <StyledCheckbox
                  checked={isOptionSelected(option.value)}
                  onChange={onDataChanged}
                  value={index}
                  name={option.value}
                />
              )}
              label={option.label}
            />
            { props.validationMessages &&
              this.isOptionSelected(option.value) &&
              renderValidationMessagesForComponent(props.validationMessages.simpleBinding, props.id) }
          </React.Fragment>
        ))}
      </FormGroup>
    </FormControl>
  );

};
