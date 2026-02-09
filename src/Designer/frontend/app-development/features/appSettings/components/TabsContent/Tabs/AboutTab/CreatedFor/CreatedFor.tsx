import React from 'react';
import type { ReactElement } from 'react';
import classes from './CreatedFor.module.css';
import { useTranslation } from 'react-i18next';
import type { Repository } from 'app-shared/types/Repository';
import { StudioParagraph } from '@studio/components';
import { DateUtils } from '@studio/pure-functions';
import { createdForOrganization } from '@studio/testing/testids';

export type CreatedForProps = {
  repository: Repository;
  authorName: string;
};

export function CreatedFor({ repository, authorName }: CreatedForProps): ReactElement {
  const { t } = useTranslation();
  const formattedDate = DateUtils.formatDateDDMMYYYY(repository.created_at);

  return (
    <div className={classes.createdByBox}>
      <StudioParagraph>{t('app_settings.about_tab_created_by')}</StudioParagraph>
      <StudioParagraph>
        {authorName} ({formattedDate})
      </StudioParagraph>
      <StudioParagraph data-testid={createdForOrganization}>
        {t('general.for')} {repository.owner.full_name || repository.owner.login}
      </StudioParagraph>
    </div>
  );
}
