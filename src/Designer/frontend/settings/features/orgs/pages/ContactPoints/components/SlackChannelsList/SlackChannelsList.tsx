import { useState } from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioTable, StudioSwitch, StudioHeading, StudioParagraph } from '@studio/components';
import { EnvironmentsCell } from '../../../../../../components/EnvironmentsCell/EnvironmentsCell';
import { ActionsCell } from '../ActionsCell/ActionsCell';
import type { ContactPoint } from 'app-shared/types/ContactPoint';
import { SlackChannelDialog } from './SlackChannelDialog/SlackChannelDialog';
import type { SlackChannel } from './SlackChannelDialog/SlackChannelDialog';
import { contactPointToSlackChannel } from './slackChannelUtils';
import { useToggleContactPointActiveMutation } from '../../../../hooks/useToggleContactPointActiveMutation';
import { useDeleteContactPointMutation } from '../../../../hooks/useDeleteContactPointMutation';
import { useOrgListQuery } from 'app-shared/hooks/queries/useOrgListQuery';
import { AddButton } from '../../../../../../components/AddButton/AddButton';

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
  const [isOpen, setIsOpen] = useState(false);
  const [initialValue, setInitialValue] = useState<SlackChannel>(createEmptySlackChannel([]));
  const [editingId, setEditingId] = useState<string | null>(null);

  const { mutate: toggleActive } = useToggleContactPointActiveMutation(org);
  const { mutate: deleteChannel } = useDeleteContactPointMutation(org);

  const { data: orgs } = useOrgListQuery();
  const availableEnvironments = orgs?.[org]?.environments ?? [];

  const openAddDialog = () => {
    setInitialValue(createEmptySlackChannel(availableEnvironments));
    setEditingId(null);
    setIsOpen(true);
  };

  const openEditDialog = (channel: ContactPoint) => {
    setInitialValue(contactPointToSlackChannel(channel));
    setEditingId(channel.id);
    setIsOpen(true);
  };

  const handleToggleActive = (channel: ContactPoint) => {
    toggleActive({ id: channel.id, isActive: !channel.isActive });
  };

  return (
    <>
      <StudioHeading level={3}>{t('settings.orgs.contact_points.slack_heading')}</StudioHeading>
      <StudioParagraph>{t('settings.orgs.contact_points.slack_description')}</StudioParagraph>
      <StudioTable>
        <StudioTable.Head>
          <StudioTable.Row>
            <StudioTable.HeaderCell>
              {t('settings.orgs.contact_points.col_active')}
            </StudioTable.HeaderCell>
            <StudioTable.HeaderCell>
              {t('settings.orgs.contact_points.col_channel_name')}
            </StudioTable.HeaderCell>
            <StudioTable.HeaderCell>
              {t('settings.orgs.contact_points.col_webhook_url')}
            </StudioTable.HeaderCell>
            <StudioTable.HeaderCell>
              {t('settings.orgs.contact_points.col_environments')}
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
                editAriaLabel={t('settings.orgs.contact_points.dialog_edit_slack_title')}
                itemName={channel.name}
              />
            </StudioTable.Row>
          ))}
        </StudioTable.Body>
      </StudioTable>
      <AddButton onClick={openAddDialog}>
        {t('settings.orgs.contact_points.add_slack_channel')}
      </AddButton>
      {isOpen && (
        <SlackChannelDialog
          initialValue={initialValue}
          availableEnvironments={availableEnvironments}
          org={org}
          editingId={editingId}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
};
