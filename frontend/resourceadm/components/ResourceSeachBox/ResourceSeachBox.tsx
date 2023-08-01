import React, { ChangeEvent } from 'react';
import classes from './ResourceSeachBox.module.css';
import { TextField } from '@digdir/design-system-react';

interface Props {
  onChange: (value: string) => void;
}

/**
 * Searchbox component that displays an input field and a search icon
 *
 * @param props.onChange function to handle the change of value
 */
export const SearchBox = ({ onChange }: Props) => {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  // TODO - translation
  return (
    <div className={classes.searchBox}>
      <TextField
        onChange={handleChange}
        placeholder='Søk etter ressurs'
        label='Søk etter en ressurs'
      />
    </div>
  );
};
