import React from 'react';
import classes from './ConfigContent.module.css';
import { NativeSelect } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import { useBpmnContext } from '../../../contexts/BpmnContext';
import { EditTaskId } from './EditTaskId/EditTaskId';
import { StudioDisplayTile, StudioSectionHeader } from '@studio/components';
import { getConfigTitleKey, getConfigTitleHelpTextKey } from '../../../utils/configPanelUtils';
import { ConfigIcon } from './ConfigIcon';
import { toast } from 'react-toastify';
import { useBpmnApiContext } from '../../../contexts/BpmnApiContext';

export const ConfigContent = (): React.ReactElement => {
  const { t } = useTranslation();
  const { availableDataModelIds, layoutSets, mutateLayoutSet } = useBpmnApiContext();
  const { bpmnDetails } = useBpmnContext();
  const configHeaderTexts: Record<'title' | 'helpText', string> = {
    title: bpmnDetails?.taskType && t(getConfigTitleKey(bpmnDetails.taskType)),
    helpText: bpmnDetails?.taskType && t(getConfigTitleHelpTextKey(bpmnDetails.taskType)),
  };
  const layoutSet = layoutSets?.sets.find((set) => set.tasks.includes(bpmnDetails.id));
  const existingDataTypeForTask = layoutSet?.dataType;
  const noModelKey = 'noModel';
  const dataModelIds = existingDataTypeForTask
    ? [...availableDataModelIds, noModelKey, existingDataTypeForTask]
    : [...availableDataModelIds, noModelKey];

  const handleChangeDataModel = (dataModelId: string) => {
    if (!layoutSet) {
      toast.error(t('process_editor.layout_set_not_found_error'));
      return;
    }
    if (dataModelId == existingDataTypeForTask) return;
    mutateLayoutSet({
      layoutSetIdToUpdate: layoutSet.id,
      layoutSetConfig: {
        ...layoutSet,
        dataType: dataModelId === noModelKey ? undefined : dataModelId,
      },
    });
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
          text: configHeaderTexts.helpText,
          title: t('process_editor.configuration_panel_header_help_text_title'),
        }}
      />

      <EditTaskId className={classes.editTaskId} />

      <StudioDisplayTile
        label={t('process_editor.configuration_panel_name_label')}
        value={bpmnDetails.name}
        className={classes.configContent}
      />
      <div className={classes.configContent}>
        <NativeSelect
          size='small'
          onChange={({ target }) => handleChangeDataModel(target.value)}
          label={t('process_editor.configuration_panel_set_datamodel')}
          value={existingDataTypeForTask ?? noModelKey}
        >
          {dataModelIds.map((option) => (
            <option key={option} value={option}>
              {option == noModelKey ? t('process_editor.configuration_panel_no_datamodel') : option}
            </option>
          ))}
        </NativeSelect>
      </div>
    </>
  );
};
