import React, { ChangeEvent } from 'react';
import classes from './ResourceSeachBox.module.css';
import { MagnifyingGlassIcon } from '@navikt/aksel-icons';

interface Props {
  onChange: (value: string) => void;
}

export const SearchBox = ({ onChange }: Props) => {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

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
