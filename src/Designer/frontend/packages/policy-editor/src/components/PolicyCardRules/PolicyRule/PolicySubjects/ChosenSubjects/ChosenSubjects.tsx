import { Trans, useTranslation } from 'react-i18next';
import { Buildings3Icon, PersonIcon } from '@studio/icons';
import { StudioAlert } from '@studio/components';
import { SubjectListItem } from '../SubjectListItem';
import classes from './ChosenSubjects.module.css';
import { getDeprecatedAltinn2SubjectsFromRule } from 'app-shared/utils/altinn2RoleUtils';

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
  const { t } = useTranslation();

  if (groups.reduce((prev, curr) => prev + curr.items.length, 0) === 0) {
    return null;
  }

  const sortedGroups = groups
    .sort((a, b) => a.items.length - b.items.length)
    .filter((group) => group.items.length > 0);
  const Icon = isPersonSubject ? PersonIcon : Buildings3Icon;
  const heading = isPersonSubject
    ? t('policy_editor.person_subjects_header')
    : t('policy_editor.org_subjects_header');

  const deprecatedAltinn2Roles = getDeprecatedAltinn2SubjectsFromRule(
    groups.flatMap((group) => group.items.map((item) => item.urn)),
  );

  const generateGroup = (group: ChosenSubjectGroup) => {
    return (
      <div key={group.heading} className={classes.chosenSubjectList} data-color='neutral'>
        <div>{group.heading}</div>
        {group.items
          .sort((a, b) => a.label.localeCompare(b.label))
          .map((item) => {
            return (
              <SubjectListItem
                key={item.urn}
                urn={item.urn}
                isPersonSubject={isPersonSubject}
                isChecked={true}
                isSelectedListItem
                title={item.label}
                handleChange={group.handleRemove}
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
      {deprecatedAltinn2Roles.length > 0 && (
        <StudioAlert data-color='warning' className={classes.deprecatedRoleAlert}>
          <Trans
            i18nKey='policy_editor.deprecated_altinn2_role_warning'
            components={{
              ul: (
                <ul>
                  {deprecatedAltinn2Roles.map((role) => (
                    <li key={role.urn}>{role.name}</li>
                  ))}
                </ul>
              ),
            }}
          />
        </StudioAlert>
      )}
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
