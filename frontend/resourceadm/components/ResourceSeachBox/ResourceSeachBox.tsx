import React, { ChangeEvent } from 'react';
import classes from './ResourceSeachBox.module.css';
import { MagnifyingGlassIcon } from '@navikt/aksel-icons';

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
      <input
        className={classes.searchField}
        type='text'
        placeholder='Søk etter ressurs'
        onChange={handleChange}
        aria-label='Søk etter ressurs'
      />
      <div className={classes.searchIconWrapper}>
        <MagnifyingGlassIcon title='Search icon' fontSize='1.5rem' />
      </div>
    </div>
  );
};
