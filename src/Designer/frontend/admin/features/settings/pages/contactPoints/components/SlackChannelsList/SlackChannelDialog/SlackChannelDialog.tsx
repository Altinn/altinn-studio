import type { ReactElement, RefObject } from 'react';
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
  dialogRef: RefObject<HTMLDialogElement>;
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

  const title = isEditing
    ? t('org.settings.contact_points.dialog_edit_slack_title')
    : t('org.settings.contact_points.dialog_add_slack_title');

  return (
    <StudioDialog ref={dialogRef} onClose={onClose}>
      <StudioDialog.Block>
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
          />
          <StudioTextfield
            label={t('org.settings.contact_points.field_webhook_url')}
            value={channel.webhookUrl}
            onChange={(e) => onFieldChange('webhookUrl', e.target.value)}
          />
        </div>
        <StudioFormActions
          primary={{ label: t('org.settings.contact_points.save'), onClick: onSave }}
          secondary={{ label: t('org.settings.contact_points.cancel'), onClick: onClose }}
          isLoading={isSaving}
        />
      </StudioDialog.Block>
    </StudioDialog>
  );
};
