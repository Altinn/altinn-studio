import React from 'react';
import classes from './MigrationStep.module.css';
import { Checkbox } from '@digdir/design-system-react';

interface Props {
  /**
   * Title of the field
   */
  title: string;
  /**
   * Text to display above the Checkbox
   */
  text: string;
  /**
   * The label of the Checkbox
   */
  checkboxText: string;
  /**
   * Flag for if the checkbox is checked or not
   */
  isChecked: boolean;
  /**
   * Function to handle the onChange of the Checkbox
   * @param b boolean of the value of the checkbox
   */
  onToggle: (b: boolean) => void;
}

/**
 * @component
 * @example
 *    <MigrationStep
 *        title='Title'
 *        text='Some text'
 *        checkboxText='Checkbox label'
 *        isChecked={isChecked}
 *        onToggle={(b: boolean) => setIsChecked(b)}
 *      />
 *
 * @property {string}[title] - Title of the field
 * @property {string}[text] - Text to display above the Checkbox
 * @property {string}[checkboxText] - The label of the Checkbox
 * @property {boolean}[isChecked] - Flag for if the checkbox is checked or not
 * @property {function}[onToggle] - Function to handle the onChange of the Checkbox
 * @returns
 */
export const MigrationStep = ({ title, text, checkboxText, isChecked, onToggle }: Props) => {
  return (
    <div className={classes.wrapper}>
      <h2 className={classes.subHeader}>{title}</h2>
      <p className={classes.text}>{text}</p>
      <Checkbox
        label={checkboxText}
        checked={isChecked}
        onChange={(e) => onToggle(e.target.checked)}
      />
    </div>
  );
};
