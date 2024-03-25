import React from 'react';
import classes from './ConfigContent.module.css';
import { NativeSelect } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import { StudioSectionHeader } from '@studio/components';
import { ConfigDetailsRow } from './ConfigDetailsRow';
import { getConfigTitleKey, getConfigTitleHelpTextKey } from '../../../utils/configPanelUtils';
import { useBpmnContext } from '../../../contexts/BpmnContext';
import { ConfigIcon } from './ConfigIcon';
import { toast } from 'react-toastify';
import { useBpmnApiContext } from '../../../contexts/BpmnApiContext';

export const ConfigContent = (): JSX.Element => {
  const { t } = useTranslation();
  const { availableDataModelIds, layoutSets, mutateLayoutSet } = useBpmnApiContext();
  const { bpmnDetails } = useBpmnContext();

  const configTitle = t(getConfigTitleKey(bpmnDetails?.taskType));
  const configHeaderHelpText =
    bpmnDetails?.taskType && t(getConfigTitleHelpTextKey(bpmnDetails?.taskType));
  const layoutSet = layoutSets?.sets.find((set) => set.tasks.includes(bpmnDetails.id));
  const existingDataTypeForTask = layoutSet?.dataType;
  const noModelKey = 'noModel';
  const dataModelIds = [...availableDataModelIds, noModelKey, existingDataTypeForTask ?? null];

  const handleChangeDataModel = (dataModelId: string) => {
    if (dataModelId == existingDataTypeForTask) return;
    debugger;
    if (!layoutSet) {
      toast.error(t('process_editor.layout_set_not_found_error'));
      return;
    }
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
          text: configTitle,
          level: 2,
        }}
        helpText={{
          text: configHeaderHelpText,
          title: t('process_editor.configuration_panel_header_help_text_title'),
        }}
      />
      <div className={classes.configSectionWrapper}>
        <ConfigDetailsRow
          title={t('process_editor.configuration_panel_id_label')}
          text={bpmnDetails.id}
        />
        <ConfigDetailsRow
          title={t('process_editor.configuration_panel_name_label')}
          text={bpmnDetails.name}
        />
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
