import React, { useState } from 'react';
import { Search } from '@digdir/designsystemet-react';

import classes from './ArchiveReferenceSearch.module.css';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
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
      error={!isEmpty && !isValid ? t('admin.instances.archive_reference_validation') : undefined}
      hideLabel={false}
      size='sm'
      label={t('admin.instances.archive_reference')}
      value={searchString}
      onClear={handleClear}
      onChange={handleChange}
      onSearchClick={handleSearchClick}
    />
  );
};
