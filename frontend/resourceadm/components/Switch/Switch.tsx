import React from 'react';
import classes from './Switch.module.css';

interface Props {
  onToggle: (isChecked: boolean) => void;
  isChecked: boolean;
}

/**
 * Switch component to toggle the state to true or false
 *
 * @param props.onToggle function to be executed when toggle
 * @param props.isChecked boolean for if the switch is chekced or not
 */
export const Switch = ({ onToggle, isChecked }: Props) => {
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
      />
      <label
        aria-label='Toggle av eller på'
        htmlFor='toggleSwitch'
        className={classes.slider}
      ></label>
    </div>
  );
};
