import React from 'react';
import classes from './Chip.module.css';

interface Props {
  text: string;
  isSelected: boolean;
  onClick: () => void;
}

/**
 * Component that displays a button that looks like a chip.
 *
 * @param props.text the text to display on the chip
 * @param props.isSelected boolean to decide the colour of the chip
 * @param props.onClick function to handle the click on the chip
 */
export const Chip = ({ text, isSelected, onClick }: Props) => {
  return (
    <button
      className={isSelected ? classes.chipSelected : classes.chip}
      type='button'
      onClick={onClick}
    >
      <p className={classes.text}>{text}</p>
    </button>
  );
};
