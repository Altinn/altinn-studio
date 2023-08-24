import React, { ChangeEvent } from "react";
import classes from "./ResourceSeachBox.module.css";
import { TextField } from "@digdir/design-system-react";

type SearchBoxProps = {
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
 * @returns {React.ReactNode} - The rendered component
 */
export const SearchBox = ({ onChange }: SearchBoxProps): React.ReactNode => {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  // TODO - translation
  return (
    <div className={classes.searchBox}>
      <TextField onChange={handleChange} label="Søk etter en ressurs" />
    </div>
  );
};
