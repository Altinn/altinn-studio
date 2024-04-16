import React from 'react';
import { List, Link, Heading } from '@digdir/design-system-react';
import { repositoryLayoutPath } from 'app-shared/api/paths';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { getDuplicatedIds } from '../../../utils/formLayoutUtils';
import type { IInternalLayout } from '../../../types/global';
import { useTranslation } from 'react-i18next';
import { StudioSectionHeader } from '@studio/components';
import { SectionHeaderWarningIcon } from '@studio/icons';
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
      <StudioSectionHeader
        icon={<SectionHeaderWarningIcon />}
        heading={{
          text: t('ux_editor.config.warning_duplicates.heading'),
          level: 2,
        }}
        className={classes.configWarningHeader}
      />
      <div className={classes.configWarningContent}>
        <Heading level={3} size='xxsmall' spacing>
          {t('ux_editor.config.warning_duplicates.heading2')}
        </Heading>
        <List.Root className={classes.configWarningList} size='small'>
          <List.Ordered>
            <List.Item>
              <Link href={repositoryLayoutPath(org, app, selectedFormLayoutName)} target='_blank'>
                {t('ux_editor.config.warning_duplicates.list1')}
              </Link>
            </List.Item>
            <List.Item>{t('ux_editor.config.warning_duplicates.list2')}</List.Item>
            <List.Item>
              {t('ux_editor.config.warning_duplicates.list3')}
              <span className={classes.duplicatedId}> {duplicatedIds}</span>.
            </List.Item>
            <List.Item>{t('ux_editor.config.warning_duplicates.list4')}</List.Item>
            <List.Item>{t('ux_editor.config.warning_duplicates.list5')}</List.Item>
            <List.Item>{t('ux_editor.config.warning_duplicates.list6')}</List.Item>
          </List.Ordered>
        </List.Root>
      </div>
    </div>
  );
};
