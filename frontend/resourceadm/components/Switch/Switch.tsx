import React, { forwardRef } from 'react';
import classes from './Switch.module.css';
import { useTranslation } from 'react-i18next';

type SwitchProps = {
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
  /**
   * Function to be executed on blur
   * @returns void
   */
  onBlur: () => void;
  id: string;
};

/**
 * @component
 *    Switch component to toggle the state to true or false
 *
 * @property {function}[onToggle] - Function to be executed when toggle
 * @property {boolean}[isChecked] - Flag for if the switch is chekced or not
 * @property {function}[onFocus] - Function to be executed on focus
 * @property {function}[onBlur] - Function to be executed on blur
 *
 * @returns {React.ReactNode} - The rendered component
 */
// TODO - replace with Design system chip. Issue: #10892
export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ onToggle, isChecked, onFocus, onBlur, id }, ref): React.ReactNode => {
    const { t } = useTranslation();

    const handleToggle = () => {
      const newCheckedState = !isChecked;
      onToggle(newCheckedState);
    };

    return (
      <div className={classes.switch}>
        <input
          type='checkbox'
          id={id}
          className={classes.checkbox}
          checked={isChecked}
          onChange={handleToggle}
          aria-label={id}
          onFocus={onFocus}
          onBlur={onBlur}
          ref={ref}
        />
        <label
          aria-label={t('resourceadm.switch_toggle')}
          htmlFor={id}
          className={classes.slider}
        ></label>
      </div>
    );
  }
);

Switch.displayName = 'Switch';
