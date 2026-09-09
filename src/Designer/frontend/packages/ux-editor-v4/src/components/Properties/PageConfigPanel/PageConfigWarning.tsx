import { repositoryLayoutPath } from 'app-shared/api/paths';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { getDuplicatedIds } from '../../../utils/formLayoutUtils';
import type { IInternalLayout } from '../../../types/global';
import { useTranslation } from 'react-i18next';
import { StudioLink, StudioList, StudioSectionHeader, StudioHeading } from '@studio/components';
import { SectionHeaderWarningIcon } from '@studio/icons';
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
        <StudioHeading level={3} data-size='xs' spacing>
          {t('ux_editor.config.warning_duplicates.solution_heading')}
        </StudioHeading>
        <StudioList.Root className={classes.configWarningList}>
          <StudioList.Ordered>
            <StudioList.Item>
              <StudioLink
                href={repositoryLayoutPath(org, app, selectedFormLayoutName)}
                target='_blank'
              >
                {t('ux_editor.config.warning_duplicates.solution_gitea')}
              </StudioLink>
            </StudioList.Item>
            <StudioList.Item>
              {t('ux_editor.config.warning_duplicates.solution_gitea_pencel')}
            </StudioList.Item>
            <StudioList.Item>
              {t('ux_editor.config.warning_duplicates.solution_gitea_locate')}
              <span className={classes.duplicatedId}> {duplicatedIds}</span>.
            </StudioList.Item>
            <StudioList.Item>
              {t('ux_editor.config.warning_duplicates.solution_gitea_edit')}
            </StudioList.Item>
            <StudioList.Item>
              {t('ux_editor.config.warning_duplicates.solution_gitea_commit')}
            </StudioList.Item>
            <StudioList.Item>
              {t('ux_editor.config.warning_duplicates.solution_studio_import')}
            </StudioList.Item>
          </StudioList.Ordered>
        </StudioList.Root>
      </div>
    </div>
  );
};
