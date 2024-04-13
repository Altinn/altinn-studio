import React from 'react';
import { List, Link, Heading, Alert } from '@digdir/design-system-react';
import { repositoryLayoutPath } from 'app-shared/api/paths';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { getDuplicatedIds } from '../../../utils/formLayoutUtils';
import type { IInternalLayout } from '../../../types/global';
import { useTranslation } from 'react-i18next';
import classes from './PageConfigWarning.module.css';

type PageConfigWarningProps = {
  layout: IInternalLayout;
  selectedFormLayoutName: string;
};

export const PageConfigWarning = ({ layout, selectedFormLayoutName }: PageConfigWarningProps) => {
  const { org, app } = useStudioUrlParams();
  const { t } = useTranslation();
  const duplicatedIds = getDuplicatedIds(layout)
    .map((id) => `<${id}>`)
    .join(', ');

  return (
    <div className={classes.configWarningWrapper}>
      <Alert severity='danger' className={classes.configWarningHeader}>
        <Heading size='xxsmall' level={2}>
          {t('ux_editor.config.warning_duplicates.heading')}
        </Heading>
      </Alert>
      <div className={classes.configWarningContent}>
        <Heading level={3} size='xxsmall' spacing>
          {t('ux_editor.config.warning_duplicates.heading2')}
        </Heading>
        <List.Root className={classes.configWarningList} size='small'>
          <List.Ordered>
            <List.Item>{t('ux_editor.config.warning_duplicates.list1')}</List.Item>
            <List.Item>
              <Link href={repositoryLayoutPath(org, app, selectedFormLayoutName)} target='_blank'>
                {t('ux_editor.config.warning_duplicates.list2')}
              </Link>
            </List.Item>
            <List.Item>{t('ux_editor.config.warning_duplicates.list3')}</List.Item>
            <List.Item>
              {t('ux_editor.config.warning_duplicates.list4')}
              <span className={classes.duplicatedId}> {duplicatedIds}</span>.
            </List.Item>
            <List.Item>{t('ux_editor.config.warning_duplicates.list5')}</List.Item>
            <List.Item>{t('ux_editor.config.warning_duplicates.list6')}</List.Item>
            <List.Item>{t('ux_editor.config.warning_duplicates.list7')}</List.Item>
          </List.Ordered>
        </List.Root>
      </div>
    </div>
  );
};
