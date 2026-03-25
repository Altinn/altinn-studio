import type { ReactElement, RefObject } from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  StudioCheckboxGroup,
  useStudioCheckboxGroup,
  StudioDialog,
  StudioTextfield,
  StudioHeading,
  StudioParagraph,
  StudioFormActions,
} from '@studio/components';
import classes from './SlackChannelDialog.module.css';

const slackWebhookUrlRegex = /^https:\/\/hooks\.slack\.com\/services\/.+/;
const slackWebhookPlaceholder = 'https://hooks.slack.com/services/...';
const channelNameMaxLength = 100;
const webhookUrlMaxLength = 255;

export type SlackChannel = {
  channelName: string;
  webhookUrl: string;
  isActive: boolean;
  environments: string[];
};

type SlackChannelDialogProps = {
  dialogRef: RefObject<HTMLDialogElement | null>;
  channel: SlackChannel;
  availableEnvironments: string[];
  onFieldChange: (field: keyof SlackChannel, value: string | boolean | string[]) => void;
  onSave: () => void;
  onClose: () => void;
  isEditing: boolean;
  isSaving: boolean;
};

export const SlackChannelDialog = ({
  dialogRef,
  channel,
  availableEnvironments,
  onFieldChange,
  onSave,
  onClose,
  isEditing,
  isSaving,
}: SlackChannelDialogProps): ReactElement => {
  const { t } = useTranslation();
  const [submitted, setSubmitted] = useState(false);

  const channelNameError =
    submitted && !channel.channelName ? t('validation_errors.required') : undefined;

  const webhookUrlError = submitted
    ? !channel.webhookUrl
      ? t('validation_errors.required')
      : !slackWebhookUrlRegex.test(channel.webhookUrl)
        ? t('validation_errors.invalid_slack_webhook_url')
        : undefined
    : undefined;

  const isValid =
    !!channel.channelName && !!channel.webhookUrl && slackWebhookUrlRegex.test(channel.webhookUrl);

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
    : t('org.settings.contact_points.add_slack_channel');

  const { getCheckboxProps, setValue } = useStudioCheckboxGroup({
    value: channel.environments,
    onChange: (value) => onFieldChange('environments', value),
    name: 'slackEnvironments',
  });

  useEffect(() => {
    setValue(channel.environments);
  }, [channel.environments, setValue]);

  return (
    <StudioDialog ref={dialogRef} onClose={handleClose}>
      <StudioDialog.Block className={classes.dialogBlock}>
        <StudioHeading level={2}>{title}</StudioHeading>
        <StudioParagraph>{t('org.settings.contact_points.dialog_subtitle')}</StudioParagraph>
        <div className={classes.fields}>
          <StudioTextfield
            label={t('org.settings.contact_points.field_channel_name')}
            value={channel.channelName}
            onChange={(e) => onFieldChange('channelName', e.target.value)}
            maxLength={channelNameMaxLength}
            required
            error={channelNameError}
            tagText={t('general.required')}
          />
          <StudioTextfield
            label={t('org.settings.contact_points.field_webhook_url')}
            value={channel.webhookUrl}
            onChange={(e) => onFieldChange('webhookUrl', e.target.value)}
            maxLength={webhookUrlMaxLength}
            placeholder={slackWebhookPlaceholder}
            required
            error={webhookUrlError}
            tagText={t('general.required')}
          />
          <StudioCheckboxGroup
            legend={t('org.settings.contact_points.field_environments')}
            className={classes.environments}
          >
            <div className={classes.environmentOptions}>
              {availableEnvironments.map((env) => (
                <StudioCheckboxGroup.Item
                  key={env}
                  label={env}
                  getCheckboxProps={getCheckboxProps(env)}
                />
              ))}
            </div>
          </StudioCheckboxGroup>
        </div>
        <StudioFormActions
          primary={{ label: t('org.settings.contact_points.save'), onClick: handleSave }}
          secondary={{ label: t('org.settings.contact_points.cancel'), onClick: handleClose }}
          isLoading={isSaving}
          className={classes.actionsWrapper}
        />
      </StudioDialog.Block>
    </StudioDialog>
  );
};
