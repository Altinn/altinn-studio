import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { PolicySubject } from '@altinn/policy-editor/types';
import { StudioAlert, StudioSearch } from '@studio/components';
import { PersonTallShortIcon } from '@studio/icons';
import classes from './RoleList.module.css';
import { hasSubject } from '@altinn/policy-editor/utils';
import { SubjectListItem } from '../SubjectListItem';

interface RoleListProps {
  selectedSubjects: string[];
  subjects: PolicySubject[];
  heading: string;
  handleChange: (subjectUrn: string, subjectLegacyUrn?: string) => void;
}
export const RoleList = ({ subjects, selectedSubjects, heading, handleChange }: RoleListProps) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState<string>('');

  const filteredSubjects = subjects.filter((subject) => {
    const q = search.toLowerCase().trim();
    const isTitleMatch = subject.name.toLowerCase().includes(q);
    const isIdMatch = subject.legacyRoleCode?.toLowerCase().includes(q);
    const isDescriptionMatch = subject.description?.toLowerCase().includes(q);
    return isTitleMatch || isIdMatch || isDescriptionMatch;
  });

  return (
    <div className={classes.roleList}>
      <StudioSearch
        label=''
        aria-label={t('policy_editor.rule_card_subjects_search', { searchCollection: heading })}
        value={search}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => setSearch(event.target.value)}
      />
      {!!search && !filteredSubjects.length && (
        <StudioAlert data-color='info'>
          {t('policy_editor.rule_card_subjects_search_no_results', { searchCollection: heading })}
        </StudioAlert>
      )}
      {filteredSubjects.map((subject) => {
        const legacyRoleCode = subject.legacyRoleCode ? ` (${subject.legacyRoleCode})` : '';
        const subjectTitle = `${subject.name}${legacyRoleCode}`;
        return (
          <SubjectListItem
            key={subject.urn}
            urn={subject.urn}
            legacyUrn={subject.legacyUrn}
            icon={PersonTallShortIcon}
            title={subjectTitle}
            description={subject.description}
            isChecked={hasSubject(selectedSubjects, subject.urn, subject.legacyUrn)}
            handleChange={handleChange}
          />
        );
      })}
    </div>
  );
};
