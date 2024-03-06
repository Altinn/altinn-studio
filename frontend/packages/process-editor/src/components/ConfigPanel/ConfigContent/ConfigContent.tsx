import React from 'react';
import { useTranslation } from 'react-i18next';

import { StudioDisplayTile, StudioSectionHeader } from '@studio/components';
import { KeyVerticalIcon } from '@studio/icons';
import { ConfigIcon } from './ConfigIcon';
import { getConfigTitleKey, getConfigTitleHelpTextKey } from '../../../utils/configPanelUtils';
import { useBpmnContext } from '../../../contexts/BpmnContext';

export const ConfigContent = (): JSX.Element => {
  const { t } = useTranslation();
  const { bpmnDetails } = useBpmnContext();

  const configTitle = t(getConfigTitleKey(bpmnDetails?.taskType));
  const configHeaderHelpText =
    bpmnDetails?.taskType && t(getConfigTitleHelpTextKey(bpmnDetails?.taskType));

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
      <StudioDisplayTile
        icon={<KeyVerticalIcon fontSize='1.2rem' />}
        label={t('process_editor.configuration_panel_id_label')}
        value={bpmnDetails.id}
      />
      <StudioDisplayTile
        label={t('process_editor.configuration_panel_name_label')}
        value={bpmnDetails.name}
      />
    </>
  );
};
