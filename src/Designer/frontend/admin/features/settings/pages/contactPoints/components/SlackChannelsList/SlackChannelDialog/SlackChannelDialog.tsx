import type { ReactElement, RefObject } from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  StudioDialog,
  StudioTextfield,
  StudioHeading,
  StudioParagraph,
  StudioFormActions,
} from '@studio/components';
import classes from './SlackChannelDialog.module.css';

type SlackChannelDraft = {
  channelName: string;
  webhookUrl: string;
  isActive: boolean;
};

type SlackChannelDialogProps = {
  dialogRef: RefObject<HTMLDialogElement | null>;
  channel: SlackChannelDraft;
  onFieldChange: (field: keyof SlackChannelDraft, value: string | boolean) => void;
  onSave: () => void;
  onClose: () => void;
  isEditing: boolean;
  isSaving: boolean;
};

export const SlackChannelDialog = ({
  dialogRef,
  channel,
  onFieldChange,
  onSave,
  onClose,
  isEditing,
  isSaving,
}: SlackChannelDialogProps): ReactElement => {
  const { t } = useTranslation();
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setSubmitted(false);
  }, [channel]);

  const channelNameError =
    submitted && !channel.channelName ? t('validation_errors.required') : undefined;

  const webhookUrlError =
    submitted && !channel.webhookUrl ? t('validation_errors.required') : undefined;

  const isValid = !!channel.channelName && !!channel.webhookUrl;

  const handleSave = () => {
    setSubmitted(true);
    if (isValid) onSave();
  };

  const handleClose = () => {
    setSubmitted(false);
    onClose();
  };

  const title = isEditing
    ? t('org.settings.contact_points.dialog_edit_slack_title')
    : t('org.settings.contact_points.dialog_add_slack_title');

  return (
    <StudioDialog ref={dialogRef} onClose={handleClose}>
      <StudioDialog.Block className={classes.dialogBlock}>
        <StudioHeading level={2} data-size='sm'>
          {title}
        </StudioHeading>
        <StudioParagraph data-size='sm'>
          {t('org.settings.contact_points.dialog_subtitle')}
        </StudioParagraph>
        <div className={classes.fields}>
          <StudioTextfield
            label={t('org.settings.contact_points.field_channel_name')}
            value={channel.channelName}
            onChange={(e) => onFieldChange('channelName', e.target.value)}
            required
            error={channelNameError}
            tagText={t('general.required')}
          />
          <StudioTextfield
            label={t('org.settings.contact_points.field_webhook_url')}
            value={channel.webhookUrl}
            onChange={(e) => onFieldChange('webhookUrl', e.target.value)}
            required
            error={webhookUrlError}
            tagText={t('general.required')}
          />
        </div>
        <StudioFormActions
          primary={{ label: t('org.settings.contact_points.save'), onClick: handleSave }}
          secondary={{ label: t('org.settings.contact_points.cancel'), onClick: handleClose }}
          isLoading={isSaving}
        />
      </StudioDialog.Block>
    </StudioDialog>
  );
};
