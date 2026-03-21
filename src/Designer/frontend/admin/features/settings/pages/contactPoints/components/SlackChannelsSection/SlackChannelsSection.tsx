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
import type {
  OrgAlertSlackChannel,
  OrgAlertSlackChannelPayload,
} from 'app-shared/types/OrgAlertContactPoint';
import { AlertSeverity } from 'app-shared/types/OrgAlertContactPoint';
import { SlackChannelDialog } from './SlackChannelDialog/SlackChannelDialog';
import { useAddOrgAlertSlackChannelMutation } from 'admin/features/settings/hooks/useAddOrgAlertSlackChannelMutation';
import { useUpdateOrgAlertSlackChannelMutation } from 'admin/features/settings/hooks/useUpdateOrgAlertSlackChannelMutation';
import { useDeleteOrgAlertSlackChannelMutation } from 'admin/features/settings/hooks/useDeleteOrgAlertSlackChannelMutation';
import { useGetOrgReposQuery } from 'admin/features/settings/hooks/useGetOrgReposQuery';
import { StudioEditIcon } from '@studio/icons';

type SlackChannelsSectionProps = {
  org: string;
  channels: OrgAlertSlackChannel[];
};

const emptyChannel = (): OrgAlertSlackChannelPayload => ({
  channelName: '',
  slackId: '',
  severity: AlertSeverity.All,
  isActive: true,
  services: null,
});

const severityLabel: Record<AlertSeverity, string> = {
  [AlertSeverity.Critical]: 'severity_critical',
  [AlertSeverity.WarningAndCritical]: 'severity_warning_critical',
  [AlertSeverity.All]: 'severity_all',
  [AlertSeverity.None]: 'severity_none',
};

export const SlackChannelsSection = ({
  org,
  channels,
}: SlackChannelsSectionProps): ReactElement => {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState<OrgAlertSlackChannelPayload>(emptyChannel());
  const [editingId, setEditingId] = useState<string | null>(null);

  const { mutate: addChannel, isPending: isAdding } = useAddOrgAlertSlackChannelMutation(org);
  const { mutate: updateChannel, isPending: isUpdating } =
    useUpdateOrgAlertSlackChannelMutation(org);
  const { mutate: deleteChannel } = useDeleteOrgAlertSlackChannelMutation(org);
  const { data: repos } = useGetOrgReposQuery(org);
  const repoNames = repos?.map((r) => r.name) ?? [];

  const isSaving = isAdding || isUpdating;

  const openAddDialog = () => {
    setDraft(emptyChannel());
    setEditingId(null);
    dialogRef.current?.showModal();
  };

  const openEditDialog = (channel: OrgAlertSlackChannel) => {
    setDraft({
      channelName: channel.channelName,
      slackId: channel.slackId,
      severity: channel.severity,
      isActive: channel.isActive,
      services: channel.services,
    });
    setEditingId(channel.id);
    dialogRef.current?.showModal();
  };

  const closeDialog = () => {
    dialogRef.current?.close();
  };

  const handleFieldChange = (
    field: keyof OrgAlertSlackChannelPayload,
    value: string | boolean | AlertSeverity,
  ) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleServicesChange = (value: string[] | null) => {
    setDraft((prev) => ({ ...prev, services: value }));
  };

  const handleSave = () => {
    if (editingId) {
      updateChannel({ id: editingId, payload: draft }, { onSuccess: closeDialog });
    } else {
      addChannel(draft, { onSuccess: closeDialog });
    }
  };

  const handleToggleActive = (channel: OrgAlertSlackChannel) => {
    updateChannel({
      id: channel.id,
      payload: {
        channelName: channel.channelName,
        slackId: channel.slackId,
        severity: channel.severity,
        isActive: !channel.isActive,
        services: channel.services,
      },
    });
  };

  const servicesLabel = (services: string[] | null): string => {
    if (services === null) return t('org.settings.contact_points.all_services');
    if (services.length === 0) return t('org.settings.contact_points.no_services');
    return services.join(', ');
  };

  return (
    <section>
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
              {t('org.settings.contact_points.col_slack_id')}
            </StudioTable.HeaderCell>
            <StudioTable.HeaderCell>
              {t('org.settings.contact_points.col_services')}
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
                  aria-label={channel.channelName}
                />
              </StudioTable.Cell>
              <StudioTable.Cell>{channel.channelName}</StudioTable.Cell>
              <StudioTable.Cell>
                {channel.slackId}
                {channel.severity !== undefined && (
                  <span>
                    {' '}
                    — {t(`org.settings.contact_points.${severityLabel[channel.severity]}`)}
                  </span>
                )}
              </StudioTable.Cell>
              <StudioTable.Cell>{servicesLabel(channel.services)}</StudioTable.Cell>
              <StudioTable.Cell>
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
      <StudioButton variant='secondary' onClick={openAddDialog}>
        + {t('org.settings.contact_points.add_contact')}
      </StudioButton>
      <SlackChannelDialog
        dialogRef={dialogRef}
        channel={draft}
        repoNames={repoNames}
        onFieldChange={handleFieldChange}
        onServicesChange={handleServicesChange}
        onSave={handleSave}
        onClose={closeDialog}
        isEditing={editingId !== null}
        isSaving={isSaving}
      />
    </section>
  );
};
