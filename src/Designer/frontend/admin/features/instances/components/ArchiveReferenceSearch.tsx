import React, { useState } from 'react';
import { Search } from '@digdir/designsystemet-react';

import classes from './ArchiveReferenceSearch.module.css';

type ArchiveReferenceSearchProps = {
  value: string | undefined;
  setValue: (value: string | undefined) => void;
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ARCHIVE_REF_REGEX = /^[0-9a-f]{12}$/i;

export const ArchiveReferenceSearch = ({
  value: _value,
  setValue,
}: ArchiveReferenceSearchProps) => {
  const value = _value ?? '';
  const [searchString, setSearchString] = useState(value);

  const isEmpty = searchString.length === 0;
  const isValid = UUID_REGEX.test(searchString) || ARCHIVE_REF_REGEX.test(searchString);
  const canSearch = isValid && searchString.toLowerCase() !== value;

  const handleClear = () => {
    setSearchString('');
    setValue(undefined);
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.value === '') {
      handleClear();
    } else {
      setSearchString(event.target.value);
    }
  };

  const handleSearchClick = () => {
    setValue(searchString.toLowerCase());
  };

  return (
    <Search
      className={classes.search}
      variant={canSearch ? 'primary' : 'simple'}
      error={
        !isEmpty && !isValid ? 'Må være en gyldig instans-ID eller arkivreferanse.' : undefined
      }
      hideLabel={false}
      size='sm'
      label='Arkivreferanse'
      value={searchString}
      onClear={handleClear}
      onChange={handleChange}
      onSearchClick={handleSearchClick}
    />
  );
};
