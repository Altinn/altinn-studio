import React from 'react';
import classes from './PolicyRuleSubjectListItem.module.css';
import { MultiplyIcon } from '@navikt/aksel-icons';

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
      <div className={classes.titleWrapper}>
        <p className={classes.subjectTitle}>{subjectTitle}</p>
      </div>
      <button className={classes.button} onClick={onRemove} type='button'>
        <MultiplyIcon title='Fjern rettigheter for valgt rolle' color='inherit' fontSize='1.3rem' />
      </button>
    </div>
  );
};
