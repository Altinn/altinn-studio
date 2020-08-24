/* eslint-disable import/first */
/* eslint-disable react/no-array-index-key */
import { FormControlLabel, FormGroup, FormLabel } from '@material-ui/core';
import Checkbox, { CheckboxProps } from '@material-ui/core/Checkbox';
import FormControl from '@material-ui/core/FormControl';
import { makeStyles } from '@material-ui/core/styles';
import * as React from 'react';
import { AltinnAppTheme } from 'altinn-shared/theme';
import classNames = require('classnames');
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
  legend: () => JSX.Element;
  getTextResource: (key: string) => JSX.Element;
  getTextResourceAsString: (key: string) => string;
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
      // tslint:disable-next-line: max-line-length
      backgroundImage: "url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3E%3Cpath fill='%23000000' d='M6.564.75l-3.59 3.612-1.538-1.55L0 4.26 2.974 7.25 8 2.193z'/%3E%3C/svg%3E\")",
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

function usePrevious(value) {
  const ref = React.useRef();
  React.useEffect(() => {
    ref.current = value.slice();
  });

  return ref.current;
}

export const CheckboxContainerComponent = (props: ICheckboxContainerProps) => {
  const classes = useStyles(props);

  const [selected, setSelected] = React.useState([]);
  const prevSelected: any = usePrevious(selected);

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
      setSelected(props.formData ? props.formData.toString().split(',') : []);
    }
  };

  const onDataChanged = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newSelected: any = selected.slice();

    if (newSelected[event.target.value] === event.target.name) {
      newSelected[event.target.value] = '';
    } else {
      newSelected[event.target.value] = event.target.name;
    }

    props.handleFocusUpdate(props.id);
    props.handleDataChange(selectedHasValues(newSelected) ? newSelected.join() : '');
  };

  const selectedHasValues = (select: string[]): boolean => {
    return select.some((element) => element !== '');
  };

  const isOptionSelected = (option: string) => {
    return selected.indexOf(option) > -1;
  };

  const inFocus = (index: number) => {
    let changed: any;
    if (!prevSelected) {
      return false;
    }
    if (prevSelected.length === 0) {
      changed = selected.findIndex((x) => !!x && x !== '');
    } else {
      changed = selected.findIndex((x) => !prevSelected.includes(x));
    }
    if (changed === -1) {
      changed = prevSelected.findIndex((x) => !selected.includes(x));
    }

    if (changed === -1) {
      return false;
    }

    return props.shouldFocus && changed === index;
  };

  const StyledCheckbox = (styledCheckboxProps: IStyledCheckboxProps) => {
    const { label, ...checkboxProps } = styledCheckboxProps;
    return (
      <Checkbox
        className={classes.root}
        disableRipple={true}
        color='default'
        checkedIcon={<span className={classNames(classes.icon, classes.checkedIcon)} />}
        icon={<span className={classes.icon} />}
        inputProps={{ 'aria-label': label }}
        {...checkboxProps}
      />
    );
  };

  const RenderLegend = props.legend;

  return (
    <FormControl key={`checkboxes_control_${props.id}`} component='fieldset'>
      <FormLabel component='legend' classes={{ root: classNames(classes.legend) }}>
        <RenderLegend />
      </FormLabel>
      <FormGroup
        row={checkBoxesIsRow}
        id={props.id}
      >
        {props.options.map((option, index) => (
          <React.Fragment key={index}>
            <FormControlLabel
              key={index}
              classes={{ root: classNames(classes.margin) }}
              control={(
                <StyledCheckbox
                  checked={isOptionSelected(option.value)}
                  onChange={onDataChanged}
                  value={index}
                  name={option.value}
                  autoFocus={inFocus(index)}
                  label={props.getTextResourceAsString(option.label)}
                />
              )}
              label={props.getTextResource(option.label)}
            />
            { props.validationMessages &&
              isOptionSelected(option.value) &&
              renderValidationMessagesForComponent(props.validationMessages.simpleBinding, props.id) }
          </React.Fragment>
        ))}
      </FormGroup>
    </FormControl>
  );
};
