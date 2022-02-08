import React from 'react';
import cn from 'classnames';
import { makeStyles } from '@material-ui/core';

import { AltinnAppTheme } from 'altinn-shared/theme';
import { useAppSelector } from 'src/common/hooks';
import { IComponentProps } from '..';

import '../../styles/shared.css';

export interface IDropdownProps extends IComponentProps {
  optionsId: string;
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
  optionsId,
  formData,
  preselectedOptionIndex,
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
  const hasSelectedInitial = React.useRef(false);

  React.useEffect(() => {
    const shouldSelectOptionAutomatically =
      !formData?.simpleBinding &&
      options &&
      preselectedOptionIndex >= 0 &&
      preselectedOptionIndex < options.length &&
      hasSelectedInitial.current === false;

    if (shouldSelectOptionAutomatically) {
      handleDataChange(options[preselectedOptionIndex].value);
      hasSelectedInitial.current = true;
    }
  }, [options, formData, preselectedOptionIndex, handleDataChange]);

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    handleDataChange(event.target.value);
  };

  const handleBlur = (event: React.FocusEvent<HTMLSelectElement>) => {
    handleDataChange(event.target.value);
  };

  return (
    <select
      id={id}
      value={formData?.simpleBinding}
      disabled={readOnly}
      className={cn(classes.select, 'custom-select a-custom-select', {
        'validation-error': !isValid,
        'disabled !important': readOnly,
      })}
      onChange={handleChange}
      onBlur={handleBlur}
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
