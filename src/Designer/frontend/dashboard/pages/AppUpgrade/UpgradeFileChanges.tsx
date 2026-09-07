import type { ReactElement } from 'react';
import { StudioDetails, StudioParagraph, StudioTag } from '@studio/components';
import { useTranslation } from 'react-i18next';
import type { AppUpgradeFileChange, AppUpgradeFileChangeKind } from 'app-shared/types/AppUpgrade';
import { FilePath } from 'app-shared/components/GiteaHeader/VersionControlButtons/components/FileChangesTable/FilePath/FilePath';
import classes from './UpgradeFileChanges.module.css';

type UpgradeFileChangesProps = {
  fileChanges: AppUpgradeFileChange[];
};

export const UpgradeFileChanges = ({ fileChanges }: UpgradeFileChangesProps): ReactElement => {
  const { t } = useTranslation();
  return (
    <StudioDetails className={classes.details}>
      <StudioDetails.Summary>
        {t('app_upgrade.file_changes.summary', { count: fileChanges.length })}
      </StudioDetails.Summary>
      <StudioDetails.Content>
        {fileChanges.length === 0 ? (
          <StudioParagraph data-size='sm'>{t('app_upgrade.file_changes.empty')}</StudioParagraph>
        ) : (
          <ul className={classes.list}>
            {fileChanges.map((change) => (
              <li key={change.path} className={classes.item}>
                <FileChangeKindTag kind={change.kind} />
                <div className={classes.file}>
                  <FilePath filePath={change.path} diff={change.diff} repoDiffStatus='success' />
                </div>
              </li>
            ))}
          </ul>
        )}
      </StudioDetails.Content>
    </StudioDetails>
  );
};

const kindColors: Record<AppUpgradeFileChangeKind, 'success' | 'info' | 'danger' | 'neutral'> = {
  Added: 'success',
  Modified: 'info',
  Deleted: 'danger',
  Renamed: 'neutral',
};

const FileChangeKindTag = ({ kind }: { kind: AppUpgradeFileChangeKind }): ReactElement => {
  const { t } = useTranslation();
  return (
    <StudioTag data-size='sm' data-color={kindColors[kind]} className={classes.kindTag}>
      {t(`app_upgrade.file_changes.kind_${kind}`)}
    </StudioTag>
  );
};
