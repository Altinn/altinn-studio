import React from 'react';
import classes from './EditDataType.module.css';
import { useBpmnContext } from '../../../../contexts/BpmnContext';
import { useBpmnApiContext } from '../../../../contexts/BpmnApiContext';
import { NativeSelect } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import type {
  MetaDataForm } from '../../../../contexts/BpmnConfigPanelContext';
import {
  useBpmnConfigPanelFormContext,
} from '../../../../contexts/BpmnConfigPanelContext';

export const EditDataType = () => {
  const { t } = useTranslation();
  const { availableDataModelIds, layoutSets, saveBpmn } = useBpmnApiContext();
  const { bpmnDetails, bpmnXml } = useBpmnContext();
  const { metaDataFormRef } = useBpmnConfigPanelFormContext();

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
    const newMetadata: MetaDataForm = {
      dataTypeChange: {
        oldDataType: existingDataTypeForTask,
        newDataType: dataModelId === noModelKey ? undefined : dataModelId,
        connectedTaskId: layoutSet.tasks[0],
      },
    };
    metaDataFormRef.current = Object.assign(
      {},
      metaDataFormRef.current,
      newMetadata,
    );
    saveBpmn(bpmnXml, metaDataFormRef.current);
  };

  return (
    <div className={classes.dataTypeSelect}>
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
  );
};
