import React from 'react';
import classes from './PolicyRuleSubjectListItem.module.css';
import { Chip } from '@digdir/design-system-react';

interface Props {
  subjectTitle: string;
  onRemove: () => void;
}

/**
 * Component to display the list of subjects that belongs to a rule in a card in
 * the policy editor. The elements in the list are removable by clicking the
 * 'X' button.
 *
 * @param props.subjectTitle the title to display on the list item
 * @param props.onRemove function to be executed when the remove button is clicked
 */
export const PolicyRuleSubjectListItem = ({ subjectTitle, onRemove }: Props) => {
  return (
    <div className={classes.wrapper}>
      <Chip.Removable aria-label={`Slett ${subjectTitle}`} size='small' onClick={onRemove}>
        {subjectTitle}
      </Chip.Removable>
    </div>
  );
};
