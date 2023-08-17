import React, { forwardRef } from 'react';
import classes from './Switch.module.css';

interface Props {
  /**
   * Function to be executed when toggle
   * @param isChecked value of the new toggle state
   * @returns void
   */
  onToggle: (isChecked: boolean) => void;
  /**
   * Flag for if the switch is chekced or not
   */
  isChecked: boolean;
  /**
   * Function to be executed on focus
   * @returns void
   */
  onFocus: () => void;
}

/**
 * @component
 *    Switch component to toggle the state to true or false
 *
 * @property {function}[onToggle] - Function to be executed when toggle
 * @property {boolean}[isChecked] - Flag for if the switch is chekced or not
 * @property {function}[onFocus] - Function to be executed on focus
 *
 * @returns {React.ReactNode} - The rendered component
 */
export const Switch = forwardRef<HTMLInputElement, Props>(
  ({ onToggle, isChecked, onFocus }, ref): React.ReactNode => {
    const handleToggle = () => {
      const newCheckedState = !isChecked;
      onToggle(newCheckedState);
    };

    return (
      <div className={classes.switch}>
        <input
          type='checkbox'
          id='toggleSwitch'
          className={classes.checkbox}
          checked={isChecked}
          onChange={handleToggle}
          aria-label='toggleSwitch'
          onFocus={onFocus}
          ref={ref}
        />
        <label
          aria-label='Toggle av eller på'
          htmlFor='toggleSwitch'
          className={classes.slider}
        ></label>
      </div>
    );
  }
);

Switch.displayName = 'Switch';
