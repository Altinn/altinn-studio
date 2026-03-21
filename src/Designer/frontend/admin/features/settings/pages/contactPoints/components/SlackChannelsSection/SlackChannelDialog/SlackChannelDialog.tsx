import type { ReactElement, RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import {
  StudioDialog,
  StudioTextfield,
  StudioHeading,
  StudioParagraph,
  StudioFormActions,
} from '@studio/components';
import type {
  OrgAlertSlackChannelPayload,
  AlertSeverity,
} from 'app-shared/types/OrgAlertContactPoint';
import { SeverityRadioGroup } from '../../SeverityRadioGroup/SeverityRadioGroup';
import { ServicesMultiSelect } from '../../ServicesMultiSelect/ServicesMultiSelect';
import classes from './SlackChannelDialog.module.css';

type SlackChannelDialogProps = {
  dialogRef: RefObject<HTMLDialogElement>;
  channel: OrgAlertSlackChannelPayload;
  repoNames: string[];
  onFieldChange: (
    field: keyof OrgAlertSlackChannelPayload,
    value: string | boolean | AlertSeverity,
  ) => void;
  onServicesChange: (value: string[] | null) => void;
  onSave: () => void;
  onClose: () => void;
  isEditing: boolean;
  isSaving: boolean;
};

export const SlackChannelDialog = ({
  dialogRef,
  channel,
  repoNames,
  onFieldChange,
  onServicesChange,
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
            label={t('org.settings.contact_points.field_slack_id')}
            value={channel.slackId}
            onChange={(e) => onFieldChange('slackId', e.target.value)}
          />
          <SeverityRadioGroup
            legend={t('org.settings.contact_points.slack_severity_label')}
            name='severity'
            value={channel.severity}
            onChange={(value) => onFieldChange('severity', value)}
          />
          {repoNames.length > 0 && (
            <ServicesMultiSelect
              repos={repoNames}
              value={channel.services}
              onChange={onServicesChange}
            />
          )}
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
