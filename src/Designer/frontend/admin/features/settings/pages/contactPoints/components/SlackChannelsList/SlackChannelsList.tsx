import { useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioTable, StudioSwitch, StudioHeading, StudioParagraph } from '@studio/components';
import { EnvironmentsCell } from '../EnvironmentsCell/EnvironmentsCell';
import { ActionsCell } from '../ActionsCell/ActionsCell';
import type { ContactPoint } from 'app-shared/types/ContactPoint';
import { SlackChannelDialog } from './SlackChannelDialog/SlackChannelDialog';
import type { SlackChannel } from './SlackChannelDialog/SlackChannelDialog';
import { slackChannelToPayload, contactPointToSlackChannel } from './slackChannelUtils';
import { useAddContactPointMutation } from 'admin/features/settings/hooks/useAddContactPointMutation';
import { useUpdateContactPointMutation } from 'admin/features/settings/hooks/useUpdateContactPointMutation';
import { useToggleContactPointActiveMutation } from 'admin/features/settings/hooks/useToggleContactPointActiveMutation';
import { useDeleteContactPointMutation } from 'admin/features/settings/hooks/useDeleteContactPointMutation';
import { useOrgListQuery } from 'app-shared/hooks/queries/useOrgListQuery';
import { AddButton } from '../AddButton/AddButton';

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
              <EnvironmentsCell environments={channel.environments} />
              <ActionsCell
                onEdit={() => openEditDialog(channel)}
                onDelete={() => deleteChannel(channel.id)}
                editAriaLabel={t('org.settings.contact_points.dialog_edit_slack_title')}
              />
            </StudioTable.Row>
          ))}
        </StudioTable.Body>
      </StudioTable>
      <AddButton onClick={openAddDialog}>
        {t('org.settings.contact_points.add_slack_channel')}
      </AddButton>
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
