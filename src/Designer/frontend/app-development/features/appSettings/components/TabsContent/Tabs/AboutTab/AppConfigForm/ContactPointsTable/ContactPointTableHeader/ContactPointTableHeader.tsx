import React, { type ReactElement } from 'react';
import { StudioTable } from '@studio/components';
import { useTranslation } from 'react-i18next';
import classes from './ContactPointTableHeader.module.css';

export const ContactPointTableHeader = (): ReactElement => {
  const { t } = useTranslation();

  return (
    <StudioTable.Head>
      <StudioTable.Row className={classes.headerNoWrap}>
        <StudioTable.Cell>
          {t('app_settings.about_tab_contact_point_fieldset_email_label')}
        </StudioTable.Cell>
        <StudioTable.Cell>
          {t('app_settings.about_tab_contact_point_fieldset_telephone_label')}
        </StudioTable.Cell>
        <StudioTable.Cell>
          {t('app_settings.about_tab_contact_point_fieldset_title_desc_label')}
        </StudioTable.Cell>
        <StudioTable.Cell>
          {t('app_settings.about_tab_contact_point_fieldset_link_label')}
        </StudioTable.Cell>
        <StudioTable.Cell aria-label={t('general.edit')} />
        <StudioTable.Cell aria-label={t('general.delete')} />
      </StudioTable.Row>
    </StudioTable.Head>
  );
};
