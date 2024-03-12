import React from 'react';
import { StudioDisplayTile, StudioSectionHeader } from '@studio/components';
import { KeyVerticalIcon } from '@studio/icons';
import { useBpmnContext } from '../../contexts/BpmnContext';
import { ConfigIcon } from '../ConfigPanel/ConfigContent/ConfigIcon';
import { getConfigTitleHelpTextKey, getConfigTitleKey } from '../../utils/configPanelUtils';
import { useTranslation } from 'react-i18next';
import { Alert, Heading, Paragraph } from '@digdir/design-system-react';
import { ConfigSurface } from '../ConfigSurface/ConfigSurface';

export const ConfigViewerPanel = (): React.ReactElement => {
  return (
    <ConfigSurface>
      <ConfigViewerPanelContent />
    </ConfigSurface>
  );
};

export const ConfigViewerPanelContent = (): React.ReactElement => {
  const { t } = useTranslation();
  const { bpmnDetails } = useBpmnContext();

  if (bpmnDetails === null || !bpmnDetails.taskType) {
    return <ChooseElementToViewAlert />;
  }

  const configTitle = t(getConfigTitleKey(bpmnDetails.taskType));
  const configHeaderHelpText =
    bpmnDetails?.taskType && t(getConfigTitleHelpTextKey(bpmnDetails.taskType));

  return (
    <>
      <StudioSectionHeader
        icon={<ConfigIcon taskType={bpmnDetails.taskType} />}
        heading={{
          text: configTitle,
          level: 2,
        }}
        helpText={{
          text: configHeaderHelpText,
          title: t('process_editor.configuration_panel_header_help_text_title'),
        }}
      />
      <div>
        <StudioDisplayTile
          icon={<KeyVerticalIcon fontSize='1.2rem' />}
          label={t('process_editor.configuration_view_panel_id_label')}
          value={bpmnDetails.id}
        />
        <StudioDisplayTile
          label={t('process_editor.configuration_view_panel_name_label')}
          value={bpmnDetails.name}
        />
      </div>
    </>
  );
};

const ChooseElementToViewAlert = (): React.ReactElement => {
  const { t } = useTranslation();
  return (
    <Alert>
      <Heading level={3} size='xxsmall' spacing>
        {t('process_editor.configuration_view_panel_no_task')}
      </Heading>
      <Paragraph size='small'>
        {t('process_editor.configuration_view_panel_please_choose_task')}
      </Paragraph>
    </Alert>
  );
};
