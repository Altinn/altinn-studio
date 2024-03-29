import React from 'react';
import classes from './ActionAndSubjectListItem.module.css';
import { Chip } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';

export type ActionAndSubjectListItemProps = {
  /**
   * The title to display
   */
  title: string;
  /**
   * Function that removes the element from the list
   */
  onRemove: () => void;
};

/**
 * @component
 *    Displays the list of subjects that belongs to a rule in a card in the policy editor.
 *
 * @example
 *    <ActionAndSubjectListItem
 *      title='title'
 *      onRemove={handleRemove}
 *    />
 *
 * @property {string}[title] - The title to display
 * @property {function}[onRemove] - Function that removes the element from the list
 *
 * @returns {React.ReactNode} - The rendered Chip element
 */
export const ActionAndSubjectListItem = ({
  title,
  onRemove,
}: ActionAndSubjectListItemProps): React.ReactNode => {
  const { t } = useTranslation();

  return (
    <div className={classes.wrapper}>
      <Chip.Removable
        aria-label={`${t('general.delete')} ${title}`}
        size='small'
        onClick={onRemove}
      >
        {title}
      </Chip.Removable>
    </div>
  );
};
