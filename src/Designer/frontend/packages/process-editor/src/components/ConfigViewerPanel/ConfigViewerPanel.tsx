import React from 'react';
import { StudioDisplayTile, StudioSectionHeader } from 'libs/studio-components-legacy/src';
import { useBpmnContext } from '../../contexts/BpmnContext';
import { ConfigIcon } from '../ConfigPanel/ConfigContent/ConfigIcon';
import { getConfigTitleHelpTextKey, getConfigTitleKey } from '../../utils/configPanelUtils';
import { useTranslation } from 'react-i18next';
import { Alert, Heading, Paragraph } from '@digdir/designsystemet-react';
import { ConfigSurface } from '../ConfigSurface/ConfigSurface';
import classes from './ConfigViewerPanel.module.css';

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

  const configHeaderTexts: Record<'title' | 'helpText', string> = {
    title: bpmnDetails.taskType && t(getConfigTitleKey(bpmnDetails.taskType)),
    helpText: bpmnDetails?.taskType && t(getConfigTitleHelpTextKey(bpmnDetails.taskType)),
  };

  const propertiesToDisplay: Array<{ label: string; value: string }> = [
    {
      label: t('process_editor.configuration_view_panel_id_label'),
      value: bpmnDetails.id,
    },
    {
      label: t('process_editor.configuration_view_panel_name_label'),
      value: bpmnDetails.name,
    },
  ];

  return (
    <>
      <StudioSectionHeader
        icon={<ConfigIcon taskType={bpmnDetails.taskType} />}
        heading={{
          text: configHeaderTexts.title,
          level: 2,
        }}
        helpText={{
          text: configHeaderTexts.helpText,
          title: t('process_editor.configuration_panel_header_help_text_title'),
        }}
      />
      <div className={classes.container}>
        {propertiesToDisplay.map(({ label, value }) => (
          <StudioDisplayTile key={label} label={label} value={value} />
        ))}
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
