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
} from '@studio/components';
import type { ContactPoint, ContactPointPayload } from 'app-shared/types/ContactPoint';
import { SlackChannelDialog } from './SlackChannelDialog/SlackChannelDialog';
import { useAddContactPointMutation } from 'admin/features/settings/hooks/useAddContactPointMutation';
import { useUpdateContactPointMutation } from 'admin/features/settings/hooks/useUpdateContactPointMutation';
import { useDeleteContactPointMutation } from 'admin/features/settings/hooks/useDeleteContactPointMutation';
import { PlusIcon, StudioEditIcon } from '@studio/icons';
import classes from './SlackChannelsList.module.css';

type SlackChannelDraft = {
  channelName: string;
  webhookUrl: string;
  isActive: boolean;
};

type SlackChannelsListProps = {
  org: string;
  channels: ContactPoint[];
};

const emptyDraft = (): SlackChannelDraft => ({ channelName: '', webhookUrl: '', isActive: true });

const draftToPayload = (draft: SlackChannelDraft): ContactPointPayload => ({
  name: draft.channelName,
  isActive: draft.isActive,
  methods: [{ methodType: 'slack_webhook', value: draft.webhookUrl }],
});

const contactPointToDraft = (cp: ContactPoint): SlackChannelDraft => ({
  channelName: cp.name,
  isActive: cp.isActive,
  webhookUrl: cp.methods.find((m) => m.methodType === 'slack_webhook')?.value ?? '',
});

export const SlackChannelsList = ({ org, channels }: SlackChannelsListProps): ReactElement => {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState<SlackChannelDraft>(emptyDraft());
  const [editingId, setEditingId] = useState<string | null>(null);

  const { mutate: addChannel, isPending: isAdding } = useAddContactPointMutation(org);
  const { mutate: updateChannel, isPending: isUpdating } = useUpdateContactPointMutation(org);
  const { mutate: deleteChannel } = useDeleteContactPointMutation(org);

  const isSaving = isAdding || isUpdating;

  const openAddDialog = () => {
    setDraft(emptyDraft());
    setEditingId(null);
    dialogRef.current?.showModal();
  };

  const openEditDialog = (channel: ContactPoint) => {
    setDraft(contactPointToDraft(channel));
    setEditingId(channel.id);
    dialogRef.current?.showModal();
  };

  const closeDialog = () => {
    dialogRef.current?.close();
  };

  const handleFieldChange = (field: keyof SlackChannelDraft, value: string | boolean) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    const payload = draftToPayload(draft);
    if (editingId) {
      updateChannel({ id: editingId, payload }, { onSuccess: closeDialog });
    } else {
      addChannel(payload, { onSuccess: closeDialog });
    }
  };

  const handleToggleActive = (channel: ContactPoint) => {
    updateChannel({
      id: channel.id,
      payload: {
        name: channel.name,
        isActive: !channel.isActive,
        methods: channel.methods.map(({ methodType, value }) => ({ methodType, value })),
      },
    });
  };

  return (
    <>
      <StudioHeading level={3} data-size='sm'>
        {t('org.settings.contact_points.slack_heading')}
      </StudioHeading>
      <StudioParagraph data-size='sm'>
        {t('org.settings.contact_points.slack_description')}
      </StudioParagraph>
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
                {channel.methods.find((m) => m.methodType === 'slack_webhook')?.value}
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
        channel={draft}
        onFieldChange={handleFieldChange}
        onSave={handleSave}
        onClose={closeDialog}
        isEditing={editingId !== null}
        isSaving={isSaving}
      />
    </>
  );
};
