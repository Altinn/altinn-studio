import React from 'react';
import { useTranslation } from 'react-i18next';

import { StudioSectionHeader } from '@studio/components';
import { ConfigIcon } from './ConfigIcon';
import { getConfigTitleKey, getConfigTitleHelpTextKey } from '../../../utils/configPanelUtils';
import { useBpmnContext } from '../../../contexts/BpmnContext';
import { EditTaskId } from './EditTaskId/EditTaskId';

export const ConfigContent = (): React.ReactElement => {
  const { t } = useTranslation();
  const { bpmnDetails } = useBpmnContext();

  const configHeaderTexts: Record<'title' | 'helpTextTitle', string> = {
    title: t(getConfigTitleKey(bpmnDetails?.taskType)),
    helpTextTitle: bpmnDetails?.taskType && t(getConfigTitleHelpTextKey(bpmnDetails?.taskType)),
  };

  return (
    <>
      <StudioSectionHeader
        icon={<ConfigIcon taskType={bpmnDetails.taskType} />}
        heading={{
          text: configHeaderTexts.title,
          level: 2,
        }}
        helpText={{
          text: configHeaderTexts.helpTextTitle,
          title: t('process_editor.configuration_panel_header_help_text_title'),
        }}
      />
      <EditTaskId />
    </>
  );
};
