/* eslint-disable jsx-a11y/control-has-associated-label */
import * as React from 'react';
import { useSelector } from 'react-redux';
import { IRuntimeState } from 'src/types';
import '../../styles/shared.css';
import classNames from 'classnames';
import { makeStyles } from '@material-ui/core';
import { AltinnAppTheme } from 'altinn-shared/theme';

export interface IDropdownProps {
  formData: string;
  getTextResourceAsString: (resourceKey: string) => string;
  handleDataChange: (value: string) => void;
  id: string;
  isValid?: boolean;
  optionsId: string;
  readOnly: boolean;
}

export interface IDropdownState {
  title: string;
  options: any[];
  name: string;
}

const useStyles = makeStyles({
  select: {
    fontSize: '1.6rem',
    '&:focus': {
      outline: `2px solid ${AltinnAppTheme.altinnPalette.primary.blueDark}`,
    },
  },
});

function DropdownComponent(props: IDropdownProps) {
  const classes = useStyles();
  const options = useSelector((state: IRuntimeState) => state.optionState.options[props.optionsId]);

  const handleOnChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    props.handleDataChange(event.target.value);
  };

  const handleOnBlur = (event: React.FocusEvent<HTMLSelectElement>) => {
    props.handleDataChange(event.target.value);
  };

  return (
    <select
      id={props.id}
      value={props.formData}
      disabled={props.readOnly}
      className={classNames(classes.select, 'custom-select a-custom-select', { 'validation-error': !props.isValid, 'disabled !important': props.readOnly })}
      onChange={handleOnChange}
      onBlur={handleOnBlur}
    >
      <option style={{ display: 'none' }}/>
      {options?.map((option, index) => (
        <option
          key={index}
          value={option.value}
        >
          {props.getTextResourceAsString(option.label)}
        </option>
      ))}
    </select>
  );
}
export default DropdownComponent;
