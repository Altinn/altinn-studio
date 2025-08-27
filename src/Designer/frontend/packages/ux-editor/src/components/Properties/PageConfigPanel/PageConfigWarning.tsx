import React from 'react';
import { List, Link, Heading } from '@digdir/designsystemet-react';
import { repositoryLayoutPath } from 'app-shared/api/paths';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { getDuplicatedIds } from '../../../utils/formLayoutUtils';
import type { IInternalLayout } from '../../../types/global';
import { useTranslation } from 'react-i18next';
import { StudioSectionHeader } from '@studio/components-legacy';
import { SectionHeaderWarningIcon } from 'libs/studio-icons/src';
import classes from './PageConfigWarning.module.css';

type PageConfigWarningProps = {
  layout: IInternalLayout;
  selectedFormLayoutName: string;
};

export const PageConfigWarning = ({ layout, selectedFormLayoutName }: PageConfigWarningProps) => {
  const { org, app } = useStudioEnvironmentParams();
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
          {t('ux_editor.config.warning_duplicates.solution_heading')}
        </Heading>
        <List.Root className={classes.configWarningList} size='small'>
          <List.Ordered>
            <List.Item>
              <Link href={repositoryLayoutPath(org, app, selectedFormLayoutName)} target='_blank'>
                {t('ux_editor.config.warning_duplicates.solution_gitea')}
              </Link>
            </List.Item>
            <List.Item>{t('ux_editor.config.warning_duplicates.solution_gitea_pencel')}</List.Item>
            <List.Item>
              {t('ux_editor.config.warning_duplicates.solution_gitea_locate')}
              <span className={classes.duplicatedId}> {duplicatedIds}</span>.
            </List.Item>
            <List.Item>{t('ux_editor.config.warning_duplicates.solution_gitea_edit')}</List.Item>
            <List.Item>{t('ux_editor.config.warning_duplicates.solution_gitea_commit')}</List.Item>
            <List.Item>{t('ux_editor.config.warning_duplicates.solution_studio_import')}</List.Item>
          </List.Ordered>
        </List.Root>
      </div>
    </div>
  );
};
