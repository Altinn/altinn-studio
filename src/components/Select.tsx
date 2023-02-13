import * as React from 'react';

import { makeStyles } from '@material-ui/core/styles';
import cn from 'classnames';

import { AltinnAppTheme } from 'src/theme/index';

import 'src/styles/shared.css';

const useStyles = makeStyles({
  select: {
    fontSize: '1rem',
    '&:focus': {
      outline: `2px solid ${AltinnAppTheme.altinnPalette.primary.blueDark}`,
    },
  },
  fullWidth: {
    width: '100%',
  },
});

const optionStyle = {
  display: 'none',
};
interface ISelectProps {
  id: string;
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string }[];
  value: string | undefined;
  disabled?: boolean;
  error?: boolean;
  fullWidth?: boolean;
  className?: string;
}

const Select = ({
  id,
  onChange,
  onBlur,
  options,
  value,
  disabled = false,
  error = false,
  fullWidth = false,
  className,
}: ISelectProps) => {
  const classes = useStyles();
  return (
    <select
      id={id}
      value={value}
      disabled={disabled}
      className={cn(
        classes.select,
        'custom-select a-custom-select',
        {
          'validation-error': error,
          'disabled !important': disabled,
        },
        className,
        fullWidth && classes.fullWidth,
      )}
      onChange={onChange}
      onBlur={onBlur}
    >
      <option style={optionStyle} />
      {options.map((option, index) => (
        <option
          key={index}
          value={option.value}
        >
          {option.label}
        </option>
      ))}
    </select>
  );
};

export default Select;
