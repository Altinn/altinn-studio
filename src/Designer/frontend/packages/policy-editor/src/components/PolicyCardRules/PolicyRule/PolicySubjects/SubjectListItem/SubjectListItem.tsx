import React, { type ElementType } from 'react';
import cn from 'classnames';
import { StudioCheckbox } from '@studio/components';
import classes from './SubjectListItem.module.css';

interface SubjectListItemProps {
  icon: ElementType;
  urn: string;
  legacyUrn?: string;
  isChecked: boolean;
  isSelectedListItem?: boolean;
  title: string;
  description?: string;
  handleChange: (urn: string, legacyUrn?: string) => void;
}

export const SubjectListItem = ({
  icon,
  urn,
  legacyUrn,
  title,
  description,
  isChecked,
  isSelectedListItem,
  handleChange,
}: SubjectListItemProps) => {
  const Icon = icon;

  return (
    <div className={cn(classes.subjectItem, { [classes.selectedSubject]: isSelectedListItem })}>
      <Icon className={classes.iconContainer} />
      <div className={classes.subjectTitle}>
        {title}
        {description && (
          <div data-color='neutral' className={classes.subjectSubTitle}>
            {description}
          </div>
        )}
      </div>
      <StudioCheckbox
        data-size='md'
        className={classes.subjectCheckbox}
        checked={isChecked}
        onChange={() => handleChange(urn, legacyUrn)}
        aria-label={title}
      />
    </div>
  );
};
