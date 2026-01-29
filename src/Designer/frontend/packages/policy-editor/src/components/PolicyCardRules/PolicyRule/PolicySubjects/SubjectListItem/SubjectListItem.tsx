import React, { type ElementType } from 'react';
import cn from 'classnames';
import { StudioCheckbox } from '@studio/components';
import classes from './SubjectListItem.module.css';

interface SubjectListItemProps {
  icon?: ElementType;
  urn: string;
  legacyUrn?: string;
  isChecked: boolean;
  isSelectedListItem?: boolean;
  title: string;
  description?: string;
  isPersonSubject?: boolean;
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
  isPersonSubject,
  handleChange,
}: SubjectListItemProps) => {
  const Icon = icon;

  return (
    <div
      className={cn(classes.subjectItem, {
        [classes.personSubject]: isSelectedListItem && isPersonSubject,
        [classes.orgSubject]: isSelectedListItem && !isPersonSubject,
      })}
    >
      {icon && (
        <Icon
          className={cn(classes.iconContainer, {
            [classes.personSubject]: isPersonSubject,
            [classes.orgSubject]: !isPersonSubject,
          })}
        />
      )}
      <div
        className={cn(classes.subjectTitle, {
          [classes.selectedSubjectTitle]: !!isSelectedListItem,
        })}
      >
        {title}
        {description && (
          <div data-color='neutral' className={classes.subjectSubTitle}>
            {description}
          </div>
        )}
      </div>
      <StudioCheckbox
        data-size='md'
        className={isSelectedListItem ? '' : classes.subjectCheckbox}
        checked={isChecked}
        onChange={() => handleChange(urn, legacyUrn)}
        aria-label={title}
      />
    </div>
  );
};
