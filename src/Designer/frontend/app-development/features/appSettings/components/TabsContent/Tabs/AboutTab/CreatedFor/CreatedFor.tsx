import React from 'react';
import type { ReactElement } from 'react';
import classes from './CreatedFor.module.css';
import { useTranslation } from 'react-i18next';
import { RepositoryType } from 'app-shared/types/global';
import type { Repository } from 'app-shared/types/Repository';
import { PersonCircleIcon } from 'libs/studio-icons/src';
import { formatDateToDateAndTimeString } from '../../../../../../../utils/dateUtils';
import { StudioParagraph } from '@studio/components';

export type CreatedForProps = {
  repositoryType: RepositoryType;
  repository: Repository;
  authorName: string;
};

export function CreatedFor({
  repositoryType,
  repository,
  authorName,
}: CreatedForProps): ReactElement {
  const { t } = useTranslation();

  return (
    <div className={classes.createdForWrapper}>
      <StudioParagraph className={classes.boldText}>
        {t(getCreatedForTextKey(repositoryType))}
      </StudioParagraph>
      <div className={classes.createdFor}>
        <img src={repository.owner.avatar_url} className={classes.avatar} alt='' />
        <StudioParagraph className={classes.createdForText}>
          {repository.owner.full_name || repository.owner.login}
        </StudioParagraph>
      </div>
      <StudioParagraph className={classes.boldText}>
        {t('app_settings.about_tab_created_by')}
      </StudioParagraph>
      <div className={classes.createdBy}>
        <PersonCircleIcon className={classes.createdByIcon} />
        <StudioParagraph className={classes.createdByText}>{authorName}</StudioParagraph>
      </div>
      <StudioParagraph className={classes.createdDate}>
        {t('app_settings.about_tab_created_date', {
          date: formatDateToDateAndTimeString(repository.created_at),
        })}
      </StudioParagraph>
    </div>
  );
}

function getCreatedForTextKey(repositoryType: RepositoryType): string {
  return repositoryType === RepositoryType.DataModels
    ? 'app_settings.about_tab_created_for_repo'
    : 'app_settings.about_tab_created_for_service';
}
