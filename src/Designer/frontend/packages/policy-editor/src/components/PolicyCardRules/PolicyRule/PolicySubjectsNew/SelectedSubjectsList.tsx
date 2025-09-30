import React, { type ReactElement } from 'react';
import cn from 'classnames';
import { StudioCheckbox } from '@studio/components';
import classes from './PolicySubjectsNew.module.css';

interface SelectedSubjectsListProps {
  items: { urn: string; title: string; legacyUrn?: string }[];
  title: string;
  icon: ReactElement;
  handleRemove: (urn: string, legacyUrn?: string) => void;
}

export const SelectedSubjectsList = ({
  items,
  title,
  icon,
  handleRemove,
}: SelectedSubjectsListProps) => {
  if (items.length === 0) {
    return null;
  }
  return (
    <div className={classes.subjectList}>
      <div className={classes.subjectTitle}>{title}</div>
      {items.map((item) => (
        <div
          key={`${item.urn}-selected`}
          className={cn(classes.subjectItem, classes.selectedSubject)}
        >
          {icon}
          <div className={classes.subjectTitle}>{item.title}</div>
          <StudioCheckbox
            data-size='md'
            className={classes.subjectCheckbox}
            checked={true}
            onChange={() => handleRemove(item.urn, item.legacyUrn)}
            aria-label={item.title}
          />
        </div>
      ))}
    </div>
  );
};
