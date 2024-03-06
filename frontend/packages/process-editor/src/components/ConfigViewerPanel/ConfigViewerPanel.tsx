import React from 'react';
import { StudioSectionHeader } from '@studio/components';
import { useBpmnContext } from '../../contexts/BpmnContext';
import { ConfigIcon } from '../ConfigPanel/ConfigContent/ConfigIcon';
import { getConfigTitleHelpTextKey, getConfigTitleKey } from '../../utils/configPanelUtils';
import { useTranslation } from 'react-i18next';

export const ConfigViewerPanel = (): React.ReactElement => {
  const { t } = useTranslation();
  const { bpmnDetails } = useBpmnContext();

  console.log({ bpmnDetails });
  if (!bpmnDetails?.taskType) return <h1>Feil</h1>;

  const configTitle = t(getConfigTitleKey(bpmnDetails?.taskType));
  const configHeaderHelpText =
    bpmnDetails?.taskType && t(getConfigTitleHelpTextKey(bpmnDetails?.taskType));

  return (
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
  );
};
