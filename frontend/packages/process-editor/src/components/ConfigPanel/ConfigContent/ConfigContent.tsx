import React from 'react';
import { useTranslation } from 'react-i18next';

import { StudioSectionHeader, StudioToggleableTextfield } from '@studio/components';
import { KeyVerticalIcon } from '@studio/icons';
import { ConfigIcon } from './ConfigIcon';
import { getConfigTitleKey, getConfigTitleHelpTextKey } from '../../../utils/configPanelUtils';
import { useBpmnContext } from '../../../contexts/BpmnContext';

export const ConfigContent = (): React.ReactElement => {
  const { t } = useTranslation();
  const { bpmnDetails } = useBpmnContext();

  const configTitle = t(getConfigTitleKey(bpmnDetails?.taskType));
  const configHeaderHelpText =
    bpmnDetails?.taskType && t(getConfigTitleHelpTextKey(bpmnDetails?.taskType));

  const handleTaskIdChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newId = event.target.value;
    // TODO: Use BPMN to update properties within the XML.
    console.log({
      oldId: bpmnDetails.id,
      newId,
    });
  };

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
      <StudioToggleableTextfield
        inputProps={{
          icon: <KeyVerticalIcon />,
          label: t('process_editor.configuration_panel_change_task_id'),
          value: bpmnDetails.id,
          onBlur: (event) => handleTaskIdChange(event),
          size: 'small',
        }}
        viewProps={{
          children: (
            <span>
              <b>ID:</b> {bpmnDetails.id}
            </span>
          ),
          value: bpmnDetails.id,
          variant: 'tertiary',
          'aria-label': t('process_editor.configuration_panel_change_task_id'),
        }}
      />
    </>
  );
};
