import React from 'react';
import { Buildings3Icon, PersonIcon } from '@studio/icons';
import { SubjectListItem } from '../SubjectListItem';
import classes from './ChosenSubjects.module.css';

type ChosenSubjectGroup = {
  heading: string;
  handleRemove: (subjectUrn: string) => void;
  items: {
    urn: string;
    label: string;
  }[];
};

interface ChosenSubjectsProps {
  isPersonSubject?: boolean;
  groups: ChosenSubjectGroup[];
}

export const ChosenSubjects = ({ isPersonSubject, groups }: ChosenSubjectsProps) => {
  if (groups.reduce((prev, curr) => prev + curr.items.length, 0) === 0) {
    return null;
  }

  const sortedGroups = groups
    .sort((a, b) => a.items.length - b.items.length)
    .filter((group) => group.items.length > 0);
  const Icon = isPersonSubject ? PersonIcon : Buildings3Icon;
  const heading = isPersonSubject ? 'For privatpersoner' : 'For virksomheter';

  const generateGroup = (group: ChosenSubjectGroup) => {
    return (
      <div key={group.heading} className={classes.chosenSubjectList} data-color='neutral'>
        <div>{group.heading}</div>
        {group.items.map((item) => {
          return (
            <SubjectListItem
              key={item.urn}
              urn={item.label}
              isPersonSubject={isPersonSubject}
              isChecked={true}
              isSelectedListItem
              title={item.label}
              handleChange={() => group.handleRemove(item.urn)}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className={classes.chosenSubjectCard}>
      <div className={classes.chosenSubjectHeader}>
        <Icon fontSize={24} /> {heading}
      </div>
      <div className={classes.chosenSubjectContainer}>
        <div className={classes.chosenSubjectColumn}>
          {sortedGroups.slice(0, sortedGroups.length > 2 ? 2 : 1).map(generateGroup)}
        </div>
        <div className={classes.chosenSubjectColumn}>
          {sortedGroups.slice(sortedGroups.length > 2 ? 2 : 1).map(generateGroup)}
        </div>
      </div>
    </div>
  );
};
