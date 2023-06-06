import React from 'react';
import Select, { StylesConfig } from 'react-select';
import { PlusIcon } from '@navikt/aksel-icons';
import classes from './PolicySubjectSelectButton.module.css';

const OPTION_ELEMENT_HEIGHT = 36;
const NUMBER_OF_OPTIONS_TO_DISPLAY = 7;

/**
 * Re-styling the react-select component to match the correct styles
 */
const customStyles: StylesConfig = {
  control: (provided, state) => ({
    ...provided,
    cursor: 'pointer',
    outline: state.isFocused ? '2px solid #98177e' : 'none',
    outlineOffset: state.isFocused ? '3px' : 'none',
    boxShadow: state.isFocused ? 'none' : provided.boxShadow,
    border: '2px solid #1e2b3c',

    ':hover': {
      border: '2px solid #0062ba',
    },
  }),

  menuList: (provided) => ({
    ...provided,
    padding: 0,
    border: '1px solid #68707c',
    borderRadius: '2px',
    boxShadow: '1px 1px 3px #00000040',
    maxHeight: `${OPTION_ELEMENT_HEIGHT * NUMBER_OF_OPTIONS_TO_DISPLAY}px`,
  }),

  menu: (provided) => ({
    ...provided,
    margin: 0,
  }),

  indicatorSeparator: (provided) => ({
    ...provided,
    display: 'none',
  }),

  option: (provided, state) => ({
    ...provided,
    borderColor: '#022f5180',
    borderWidth: '1px 0 0 0',
    borderStyle: 'solid',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '300',
    minHeight: `${OPTION_ELEMENT_HEIGHT}px`,
    backgroundColor: state.isFocused ? '#b3d0ea' : 'transparent',

    ':first-of-type': {
      border: 'none',
    },

    ':hover': {
      backgroundColor: '#e6eff8',
    },
  }),
};

/**
 * Displays a custom made dropdown indicator displaying the
 * plus icon instead of the arrow down
 */
const CustomDropdownIndicator = () => (
  <div className={classes.customDropdownIndicator}>
    <PlusIcon title='Legg til en rolle' fontSize='1.5rem' />
  </div>
);

interface Props {
  options: { value: string; label: string }[];
  onChange: (options: string) => void;
}

/**
 * Component that displays a select element used to select subjects one-by-one
 * for a rule in the policy editor.
 *
 * @param props.options the options to select from
 * @param props.onChange function to be executed when an element in the list is clicked
 */
export const PolicySubjectSelectButton = ({ options, onChange }: Props) => {
  return (
    <div>
      <Select
        options={options}
        isSearchable
        onChange={(selectedOption: { value: string; label: string }) =>
          selectedOption !== null && onChange(selectedOption.value)
        }
        placeholder='Legg til'
        value={{ value: 'Legg til rolle', label: 'Legg til rolle' }}
        aria-label='Legg til rolle som skal ha rettighetene'
        styles={customStyles}
        components={{ DropdownIndicator: CustomDropdownIndicator }}
      />
    </div>
  );
};
