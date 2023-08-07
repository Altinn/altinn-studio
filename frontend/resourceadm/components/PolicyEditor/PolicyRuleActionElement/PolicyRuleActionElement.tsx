import React from 'react';
import classes from './PolicyRuleActionElement.module.css';
import { Chip } from '@digdir/design-system-react';

interface Props {
  /**
   * Function to handle the click of the action element
   */
  onClick: () => void;
  /**
   * Boolean for if the chip is selected or not
   */
  selected: boolean;
  /**
   * The text to display
   */
  text: string;
}

/**
 * @component
 * @example
 *    <PolicyRuleActionElement
 *      onClick={handleOnClick}
 *      selected={selected}
 *      text='Chip'
 *    />
 *
 * @property {function}[onClick] - Function to handle the click of the action element
 * @property {boolean}[selected] - Boolean for if the chip is selected or not
 * @property {string}[text] - The text to display
 *
 * @returns {React.ReactNode} - The rendered Chip element
 */
export const PolicyRuleActionElement = ({ onClick, selected, text }: Props): React.ReactNode => {
  return (
    <div className={classes.chipWrapper}>
      <Chip.Toggle onClick={onClick} selected={selected} checkmark={selected}>
        {text}
      </Chip.Toggle>
    </div>
  );
};
