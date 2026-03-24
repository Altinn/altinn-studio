import { useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import {
  StudioTable,
  StudioButton,
  StudioSwitch,
  StudioHeading,
  StudioParagraph,
  StudioDeleteButton,
  StudioTag,
} from '@studio/components';
import type { ContactPoint, ContactPointPayload } from 'app-shared/types/ContactPoint';
import { SlackChannelDialog } from './SlackChannelDialog/SlackChannelDialog';
import type { SlackChannel } from './SlackChannelDialog/SlackChannelDialog';
import { useAddContactPointMutation } from 'admin/features/settings/hooks/useAddContactPointMutation';
import { useUpdateContactPointMutation } from 'admin/features/settings/hooks/useUpdateContactPointMutation';
import { useToggleContactPointActiveMutation } from 'admin/features/settings/hooks/useToggleContactPointActiveMutation';
import { useDeleteContactPointMutation } from 'admin/features/settings/hooks/useDeleteContactPointMutation';
import { useOrgListQuery } from 'app-shared/hooks/queries/useOrgListQuery';
import { PlusIcon, StudioEditIcon } from '@studio/icons';
import classes from './SlackChannelsList.module.css';

type SlackChannelsListProps = {
  org: string;
  channels: ContactPoint[];
};

const createEmptySlackChannel = (availableEnvironments: string[]): SlackChannel => ({
  channelName: '',
  webhookUrl: '',
  isActive: true,
  environments: availableEnvironments,
});

const slackChannelToPayload = (channel: SlackChannel): ContactPointPayload => ({
  name: channel.channelName,
  isActive: channel.isActive,
  environments: channel.environments,
  methods: [{ methodType: 'slack', value: channel.webhookUrl }],
});

const contactPointToSlackChannel = (cp: ContactPoint): SlackChannel => ({
  channelName: cp.name,
  isActive: cp.isActive,
  environments: cp.environments,
  webhookUrl: cp.methods.find((m) => m.methodType === 'slack')?.value ?? '',
});

export const SlackChannelsList = ({ org, channels }: SlackChannelsListProps): ReactElement => {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [channelForm, setChannelForm] = useState<SlackChannel>(createEmptySlackChannel([]));
  const [editingId, setEditingId] = useState<string | null>(null);

  const { mutate: addChannel, isPending: isAdding } = useAddContactPointMutation(org);
  const { mutate: updateChannel, isPending: isUpdating } = useUpdateContactPointMutation(org);
  const { mutate: toggleActive } = useToggleContactPointActiveMutation(org);
  const { mutate: deleteChannel } = useDeleteContactPointMutation(org);

  const { data: orgs } = useOrgListQuery();
  const availableEnvironments = orgs?.[org]?.environments ?? [];

  const isSaving = isAdding || isUpdating;

  const openAddDialog = () => {
    setChannelForm(createEmptySlackChannel(availableEnvironments));
    setEditingId(null);
    dialogRef.current?.showModal();
  };

  const openEditDialog = (channel: ContactPoint) => {
    setChannelForm(contactPointToSlackChannel(channel));
    setEditingId(channel.id);
    dialogRef.current?.showModal();
  };

  const closeDialog = () => {
    dialogRef.current?.close();
  };

  const handleFieldChange = (field: keyof SlackChannel, value: string | boolean | string[]) => {
    setChannelForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    const payload = slackChannelToPayload(channelForm);
    if (editingId) {
      updateChannel({ id: editingId, payload }, { onSuccess: closeDialog });
    } else {
      addChannel(payload, { onSuccess: closeDialog });
    }
  };

  const handleToggleActive = (channel: ContactPoint) => {
    toggleActive({ id: channel.id, isActive: !channel.isActive });
  };

  return (
    <>
      <StudioHeading level={3}>{t('org.settings.contact_points.slack_heading')}</StudioHeading>
      <StudioParagraph>{t('org.settings.contact_points.slack_description')}</StudioParagraph>
      <StudioTable>
        <StudioTable.Head>
          <StudioTable.Row>
            <StudioTable.HeaderCell>
              {t('org.settings.contact_points.col_active')}
            </StudioTable.HeaderCell>
            <StudioTable.HeaderCell>
              {t('org.settings.contact_points.col_channel_name')}
            </StudioTable.HeaderCell>
            <StudioTable.HeaderCell>
              {t('org.settings.contact_points.col_webhook_url')}
            </StudioTable.HeaderCell>
            <StudioTable.HeaderCell>
              {t('org.settings.contact_points.col_environments')}
            </StudioTable.HeaderCell>
            <StudioTable.HeaderCell />
          </StudioTable.Row>
        </StudioTable.Head>
        <StudioTable.Body>
          {channels.map((channel) => (
            <StudioTable.Row key={channel.id}>
              <StudioTable.Cell>
                <StudioSwitch
                  checked={channel.isActive}
                  onChange={() => handleToggleActive(channel)}
                  aria-label={channel.name}
                />
              </StudioTable.Cell>
              <StudioTable.Cell>{channel.name}</StudioTable.Cell>
              <StudioTable.Cell>
                {channel.methods.find((m) => m.methodType === 'slack')?.value}
              </StudioTable.Cell>
              <StudioTable.Cell>
                <div className={classes.environmentsWrapper}>
                  {channel.environments.map((env) => (
                    <StudioTag key={env}>{env}</StudioTag>
                  ))}
                </div>
              </StudioTable.Cell>
              <StudioTable.Cell className={classes.actions}>
                <StudioButton
                  variant='tertiary'
                  icon={<StudioEditIcon />}
                  onClick={() => openEditDialog(channel)}
                  aria-label={t('org.settings.contact_points.dialog_edit_slack_title')}
                />
                <StudioDeleteButton
                  onDelete={() => deleteChannel(channel.id)}
                  confirmMessage={t('org.settings.contact_points.delete_confirm')}
                />
              </StudioTable.Cell>
            </StudioTable.Row>
          ))}
        </StudioTable.Body>
      </StudioTable>
      <div className={classes.addButtonWrapper}>
        <StudioButton
          variant='secondary'
          icon={<PlusIcon />}
          onClick={openAddDialog}
          className={classes.addButton}
        >
          {t('org.settings.contact_points.add_contact')}
        </StudioButton>
      </div>
      <SlackChannelDialog
        dialogRef={dialogRef}
        channel={channelForm}
        availableEnvironments={availableEnvironments}
        onFieldChange={handleFieldChange}
        onSave={handleSave}
        onClose={closeDialog}
        isEditing={editingId !== null}
        isSaving={isSaving}
      />
    </>
  );
};
