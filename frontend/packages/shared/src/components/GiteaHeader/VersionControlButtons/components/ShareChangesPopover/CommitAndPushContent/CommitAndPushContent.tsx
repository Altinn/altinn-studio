import React, { useState } from 'react';
import classes from './CommitAndPushContent.module.css';
import { useTranslation } from 'react-i18next';
import { useVersionControlButtonsContext } from '../../../context';
import { Heading, Paragraph } from '@digdir/design-system-react';
import { StudioButton, StudioTextarea } from '@studio/components';

export type CommitAndPushContentProps = {
  handleClosePopover: () => void;
};

export const CommitAndPushContent = ({ handleClosePopover }: CommitAndPushContentProps) => {
  const { t } = useTranslation();
  const { commitAndPushChanges } = useVersionControlButtonsContext();

  const [commitMessage, setCommitMessage] = useState('');

  const handleClickCommitAndPush = async () => {
    await commitAndPushChanges(commitMessage);
    handleClosePopover();
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
      <Paragraph size='small' spacing>
        {t('sync_header.describe_and_validate_sub_sub_message')}
      </Paragraph>
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
        size='small'
        fullWidth
        className={classes.commitAndPushButton}
      >
        {t('sync_header.describe_and_validate_btnText')}
      </StudioButton>
    </>
  );
};
