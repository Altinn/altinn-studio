import React, { ReactNode } from 'react';
import classes from './LocalChangesTab.module.css';
import { useTranslation } from 'react-i18next';
import { TabHeader } from '../../TabHeader';
import { Button, Label, Paragraph } from '@digdir/design-system-react';
import { DownloadIcon, TrashIcon } from '@navikt/aksel-icons';

export type LocalChangesTabProps = {};

/**
 * @component
 *    Displays the tab rendering the local changes for an app
 *
 * @returns {ReactNode} - The rendered component
 */
export const LocalChangesTab = ({}: LocalChangesTabProps): ReactNode => {
  const { t } = useTranslation();

  const handleDownload = () => {};
  const handleDelete = () => {};

  return (
    <div>
      <TabHeader text={t('settings_modal.local_changes_tab_heading')} />
      <div className={classes.contentWrapper}>
        <Paragraph>{t('settings_modal.local_changes_tab_info_text')}</Paragraph>
        <div className={classes.textAndButtonWrapper}>
          <Label as='p' spacing>
            {t('settings_modal.local_changes_tab_download_label')}
          </Label>
          <Paragraph className={classes.paragraph}>
            {t('settings_modal.local_changes_tab_download_description')}
          </Paragraph>
          <Button
            variant='outline'
            onClick={handleDownload}
            icon={<DownloadIcon />}
            iconPlacement='right'
          >
            {t('settings_modal.local_changes_tab_download_button')}
          </Button>
        </div>
        <div className={classes.textAndButtonWrapper}>
          <Label as='p' spacing>
            {t('settings_modal.local_changes_tab_delete_label')}
          </Label>
          <Paragraph className={classes.paragraph}>
            {t('settings_modal.local_changes_tab_delete_description')}
          </Paragraph>
          <Button
            color='danger'
            variant='outline'
            onClick={handleDelete}
            icon={<TrashIcon />}
            iconPlacement='right'
          >
            {t('settings_modal.local_changes_tab_delete_button')}
          </Button>
        </div>
      </div>
    </div>
  );
};
