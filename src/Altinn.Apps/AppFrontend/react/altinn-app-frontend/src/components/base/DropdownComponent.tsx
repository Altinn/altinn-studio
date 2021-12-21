/* eslint-disable jsx-a11y/control-has-associated-label */
import * as React from 'react';
import '../../styles/shared.css';
import classNames from 'classnames';
import { makeStyles } from '@material-ui/core';
import { AltinnAppTheme } from 'altinn-shared/theme';
import { useAppSelector } from 'src/common/hooks';

export interface IDropdownProps {
  formData: string;
  getTextResourceAsString: (resourceKey: string) => string;
  handleDataChange: (value: string) => void;
  id: string;
  isValid?: boolean;
  optionsId: string;
  readOnly: boolean;
  preselectedOptionIndex?: number;
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

const optionStyle = {
  display: 'none',
};

function DropdownComponent({
  formData,
  preselectedOptionIndex,
  optionsId,
  handleDataChange,
  id,
  readOnly,
  isValid,
  getTextResourceAsString,
}: IDropdownProps) {
  const classes = useStyles();
  const options = useAppSelector(
    (state) => state.optionState.options[optionsId],
  );

  React.useEffect(() => {
    if (
      !formData &&
      preselectedOptionIndex >= 0 &&
      options &&
      preselectedOptionIndex < options.length
    ) {
      handleDataChange(options[preselectedOptionIndex].value);
    }
  }, [formData, preselectedOptionIndex, handleDataChange, options]);

  const handleOnChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    handleDataChange(event.target.value);
  };

  const handleOnBlur = (event: React.FocusEvent<HTMLSelectElement>) => {
    handleDataChange(event.target.value);
  };

  return (
    <select
      id={id}
      value={formData}
      disabled={readOnly}
      className={classNames(classes.select, 'custom-select a-custom-select', {
        'validation-error': !isValid,
        'disabled !important': readOnly,
      })}
      onChange={handleOnChange}
      onBlur={handleOnBlur}
    >
      <option style={optionStyle} />
      {options?.map((option, index) => (
        <option key={index} value={option.value}>
          {getTextResourceAsString(option.label)}
        </option>
      ))}
    </select>
  );
}
export default DropdownComponent;
