import type { ChangeEvent } from 'react';
import React from 'react';
import classes from './ResourceSeachBox.module.css';
import { Textfield } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';

export type SearchBoxProps = {
  /**
   * Function to handle the change of value
   * @param value the value typed
   * @returns void
   */
  onChange: (value: string) => void;
};

/**
 * @component
 *    Searchbox component that displays an input field and a search icon
 *
 * @property {function}[onChange] - Function to handle the change of value
 *
 * @returns {React.JSX.Element} - The rendered component
 */
export const SearchBox = ({ onChange }: SearchBoxProps): React.JSX.Element => {
  const { t } = useTranslation();

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className={classes.searchBox}>
      <Textfield onChange={handleChange} label={t('resourceadm.dashboard_searchbox')} />
    </div>
  );
};
