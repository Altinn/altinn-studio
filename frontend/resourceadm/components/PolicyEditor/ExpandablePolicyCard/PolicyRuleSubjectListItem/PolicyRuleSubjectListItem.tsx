import React from 'react';
import classes from './PolicyRuleSubjectListItem.module.css';
import { Chip } from '@digdir/design-system-react';

interface Props {
  /**
   * The title to display
   */
  subjectTitle: string;
  /**
   * Function that removes the element from the list
   */
  onRemove: () => void;
}

/**
 * @component
 *    Displays the list of subjects that belongs to a rule in a card in the policy editor.
 *
 * @example
 *    <PolicyRuleSubjectListItem
 *      subjectTitle='title'
 *      onRemove={handleRemove}
 *    />
 *
 * @property {string}[subjectTitle] - The title to display
 * @property {function}[onRemove] - Function that removes the element from the list
 *
 * @returns {React.ReactNode} - The rendered Chip element
 */
export const PolicyRuleSubjectListItem = ({ subjectTitle, onRemove }: Props): React.ReactNode => {
  return (
    <div className={classes.wrapper}>
      <Chip.Removable aria-label={`Slett ${subjectTitle}`} size='small' onClick={onRemove}>
        {subjectTitle}
      </Chip.Removable>
    </div>
  );
};
