import React, { type ReactElement } from 'react';
import cn from 'classnames';
import { StudioCheckbox } from '@studio/components';
import classes from './PolicySubjectsNew.module.css';

interface SelectedSubjectsListProps {
  items: { urn: string; title: string }[];
  title: string;
  icon: ReactElement;
  handleChange: (urn: string) => void;
}

export const SelectedSubjectsList = ({
  items,
  title,
  icon,
  handleChange,
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
            onChange={() => handleChange(item.urn)}
            aria-label={item.title}
          />
        </div>
      ))}
    </div>
  );
};
