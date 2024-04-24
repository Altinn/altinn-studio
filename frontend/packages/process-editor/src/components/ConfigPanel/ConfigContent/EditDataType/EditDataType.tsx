import React, { useEffect, useState } from 'react';
import { useBpmnContext } from '../../../../contexts/BpmnContext';
import { useBpmnApiContext } from '../../../../contexts/BpmnApiContext';
import { StudioProperty } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { LinkIcon } from '@studio/icons';
import { SelectDataType } from './SelectDataType';
import classes from './EditDataType.module.css';

export const EditDataType = () => {
  const { t } = useTranslation();
  const { availableDataModelIds, layoutSets } = useBpmnApiContext();
  const { bpmnDetails } = useBpmnContext();
  const [dataModelSelectVisible, setDataModelSelectVisible] = useState(false);

  useEffect(() => {
    setDataModelSelectVisible(false);
  }, [bpmnDetails]);

  const layoutSet = layoutSets?.sets.find((set) => set.tasks.includes(bpmnDetails.id));
  const existingDataTypeForTask = layoutSet?.dataType;
  const dataModelIds = availableDataModelIds
    ? [...availableDataModelIds, ...(existingDataTypeForTask ? [existingDataTypeForTask] : [])]
    : [];

  return (
    <>
      {!existingDataTypeForTask && !dataModelSelectVisible ? (
        <StudioProperty.Button
          onClick={() => setDataModelSelectVisible(true)}
          property={t('process_editor.configuration_panel_set_datamodel_link')}
          size='small'
          icon={<LinkIcon />}
          className={classes.datamodelUndefined}
        />
      ) : dataModelSelectVisible ? (
        <SelectDataType
          dataModelIds={dataModelIds}
          existingDataType={existingDataTypeForTask}
          connectedTaskId={layoutSet.tasks[0]}
          onClose={() => setDataModelSelectVisible(false)}
        />
      ) : (
        <StudioProperty.Button
          aria-label={t('process_editor.configuration_panel_set_datamodel')}
          onClick={() => setDataModelSelectVisible(true)}
          property={t('process_editor.configuration_panel_set_datamodel')}
          title={t('process_editor.configuration_panel_set_datamodel')}
          value={existingDataTypeForTask}
          className={classes.datamodelDefined}
        />
      )}
    </>
  );
};
