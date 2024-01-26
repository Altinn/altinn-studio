import type { ReactNode } from 'react';
import React from 'react';
import classes from './CreatedFor.module.css';
import { Label, Paragraph } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import { RepositoryType } from 'app-shared/types/global';
import type { Repository } from 'app-shared/types/Repository';
import { PersonCircleIcon } from '@navikt/aksel-icons';
import { formatDateToDateAndTimeString } from 'app-development/utils/dateUtils';

export type CreatedForProps = {
  repositoryType: RepositoryType;
  repository: Repository;
  authorName: string;
};

/**
 * @component
 *    Displays the section for "created for" in the About Tab in the Settings modal
 *
 * @property {RepositoryType}[repositoryType] - The repository type
 * @property {Repository}[repository] - The repository
 * @property {string}[authorName] - The name of the author
 *
 * @returns {ReactNode} - The rendered component
 */
export const CreatedFor = ({
  repositoryType,
  repository,
  authorName,
}: CreatedForProps): ReactNode => {
  const { t } = useTranslation();

  return (
    <div className={classes.wrapper}>
      <Label as='p' size='small' spacing className={classes.label}>
        {t(
          repositoryType === RepositoryType.Datamodels
            ? 'settings_modal.about_tab_created_for_repo'
            : 'settings_modal.about_tab_created_for_service',
        )}
      </Label>
      <div className={classes.createdFor}>
        <img src={repository.owner.avatar_url} className={classes.avatar} alt='' />
        <Paragraph size='small' className={classes.createdForText}>
          {repository.owner.full_name || repository.owner.login}
        </Paragraph>
      </div>
      <Label as='p' size='small' spacing className={classes.label}>
        {t('settings_modal.about_tab_created_by')}
      </Label>
      <div className={classes.createdBy}>
        <PersonCircleIcon className={classes.createdByIcon} />
        <Paragraph size='small' className={classes.createdByText}>
          {authorName}
        </Paragraph>
      </div>
      <Paragraph size='small' className={classes.createdDate}>
        {t('settings_modal.about_tab_created_date', {
          date: formatDateToDateAndTimeString(repository.created_at),
        })}
      </Paragraph>
    </div>
  );
};
