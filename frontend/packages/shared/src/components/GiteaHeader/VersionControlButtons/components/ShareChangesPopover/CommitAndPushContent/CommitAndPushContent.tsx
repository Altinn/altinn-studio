import React, { useState } from 'react';
import classes from './CommitAndPushContent.module.css';
import { useTranslation } from 'react-i18next';
import { useVersionControlButtonsContext } from '../../../context';
import { Heading, Paragraph } from '@digdir/designsystemet-react';
import { StudioButton, StudioTextarea } from '@studio/components-legacy';
import type { RepoContentStatus } from 'app-shared/types/RepoStatus';
import { FileChangesInfoModal } from './FileChangesInfoModal';

export type CommitAndPushContentProps = {
  onClosePopover: () => void;
  fileChanges: RepoContentStatus[];
};

export const CommitAndPushContent = ({
  onClosePopover,
  fileChanges,
}: CommitAndPushContentProps) => {
  const { t } = useTranslation();
  const { commitAndPushChanges } = useVersionControlButtonsContext();

  const [commitMessage, setCommitMessage] = useState('');

  const handleClickCommitAndPush = async () => {
    await commitAndPushChanges(commitMessage);
    onClosePopover();
  };

  const handleTextareaChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCommitMessage(event.target.value);
  };

  return (
    <>
      <Heading size='xxsmall' className={classes.heading} level={3}>
        {t('sync_header.describe_and_validate')}
      </Heading>
      <Paragraph size='small' spacing>
        {t('sync_header.describe_and_validate_sub_message')}
      </Paragraph>
      <FileChangesInfoModal fileChanges={fileChanges} />
      <StudioTextarea
        label={t('sync_header.describe_changes_made')}
        value={commitMessage}
        onChange={handleTextareaChange}
        rows={4}
      />
      <StudioButton
        variant='primary'
        color='first'
        onClick={handleClickCommitAndPush}
        id='share_changes_modal_button'
        fullWidth
        className={classes.commitAndPushButton}
      >
        {t('sync_header.describe_and_validate_btnText')}
      </StudioButton>
    </>
  );
};
