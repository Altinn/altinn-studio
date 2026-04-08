import type { ReactElement } from 'react';
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
import { useAddContactPointMutation } from '../../../../../hooks/useAddContactPointMutation';
import { useUpdateContactPointMutation } from '../../../../../hooks/useUpdateContactPointMutation';
import { slackChannelToPayload } from '../slackChannelUtils';

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
  initialValue: SlackChannel;
  availableEnvironments: string[];
  org: string;
  editingId: string | null;
  onClose: () => void;
};

export const SlackChannelDialog = ({
  initialValue,
  availableEnvironments,
  org,
  editingId,
  onClose,
}: SlackChannelDialogProps): ReactElement => {
  const { t } = useTranslation();
  const [channel, setChannel] = useState(initialValue);
  const [submitted, setSubmitted] = useState(false);

  const { mutate: addChannel, isPending: isAdding } = useAddContactPointMutation(org);
  const { mutate: updateChannel, isPending: isUpdating } = useUpdateContactPointMutation(org);
  const isSaving = isAdding || isUpdating;

  const trimmedChannelName = channel.channelName.trim();
  const trimmedWebhookUrl = channel.webhookUrl.trim();

  const channelNameError =
    submitted && !trimmedChannelName ? t('validation_errors.required') : undefined;

  const webhookUrlError = submitted
    ? !trimmedWebhookUrl
      ? t('validation_errors.required')
      : !slackWebhookUrlRegex.test(trimmedWebhookUrl)
        ? t('validation_errors.invalid_slack_webhook_url')
        : undefined
    : undefined;

  const isValid =
    !!trimmedChannelName && !!trimmedWebhookUrl && slackWebhookUrlRegex.test(trimmedWebhookUrl);

  const handleClose = () => {
    if (!isSaving) onClose();
  };

  const handleSave = () => {
    const trimmedChannel = {
      ...channel,
      channelName: trimmedChannelName,
      webhookUrl: trimmedWebhookUrl,
    };
    setSubmitted(true);
    if (!isValid) return;
    const payload = slackChannelToPayload(trimmedChannel);
    if (editingId) {
      updateChannel({ id: editingId, payload }, { onSuccess: onClose });
    } else {
      addChannel(payload, { onSuccess: onClose });
    }
  };

  const isEditing = editingId !== null;

  const title = isEditing
    ? t('settings.orgs.contact_points.dialog_edit_slack_title')
    : t('settings.orgs.contact_points.add_slack_channel');

  const { getCheckboxProps, setValue } = useStudioCheckboxGroup({
    value: channel.environments,
    onChange: (value) => setChannel((prev) => ({ ...prev, environments: value })),
    name: 'slackEnvironments',
  });

  useEffect(() => {
    setValue(channel.environments);
  }, [channel.environments, setValue]);

  return (
    <StudioDialog open onClose={handleClose}>
      <StudioDialog.Block className={classes.dialogBlock}>
        <StudioHeading level={2}>{title}</StudioHeading>
        <StudioParagraph>{t('settings.orgs.contact_points.dialog_subtitle')}</StudioParagraph>
        <div className={classes.fields}>
          <StudioTextfield
            label={t('settings.orgs.contact_points.field_channel_name')}
            value={channel.channelName}
            onChange={(e) => setChannel((prev) => ({ ...prev, channelName: e.target.value }))}
            maxLength={channelNameMaxLength}
            required
            error={channelNameError}
            tagText={t('general.required')}
          />
          <StudioTextfield
            label={t('settings.orgs.contact_points.field_webhook_url')}
            value={channel.webhookUrl}
            onChange={(e) => setChannel((prev) => ({ ...prev, webhookUrl: e.target.value }))}
            maxLength={webhookUrlMaxLength}
            placeholder={slackWebhookPlaceholder}
            required
            error={webhookUrlError}
            tagText={t('general.required')}
          />
          <StudioCheckboxGroup
            legend={t('settings.orgs.contact_points.field_environments')}
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
          primary={{
            label: isEditing ? t('general.save') : t('general.add'),
            onClick: handleSave,
          }}
          secondary={{ label: t('general.cancel'), onClick: handleClose }}
          isLoading={isSaving}
          className={classes.actionsWrapper}
        />
      </StudioDialog.Block>
    </StudioDialog>
  );
};
