import React from 'react';
import { StudioDisplayTile, StudioSectionHeader } from '@studio/components';
import { KeyVerticalIcon } from '@studio/icons';
import { useBpmnContext } from '../../contexts/BpmnContext';
import { ConfigIcon } from '../ConfigPanel/ConfigContent/ConfigIcon';
import { getConfigTitleHelpTextKey, getConfigTitleKey } from '../../utils/configPanelUtils';
import { useTranslation } from 'react-i18next';
import { Paragraph } from '@digdir/design-system-react';
import classes from '../ConfigPanel/ConfigPanel.module.css';

export const ConfigViewerPanel = (): React.ReactElement => {
  return <div className={classes.configPanel}>{<ConfigViewerPanelContent />}</div>;
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
  return <Paragraph>Choose element to view property details for</Paragraph>;
};
