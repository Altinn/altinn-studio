import React, { useEffect, useState } from 'react';
import { StudioProperty } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { LinkIcon } from '@studio/icons';
import { SelectDataTypes } from './SelectDataTypes';
import { useBpmnContext } from '../../../../contexts/BpmnContext';

export type EditDataTypesProps = {
  dataModelIds: string[];
  connectedTaskId: string;
  existingDataTypeForTask: string | undefined;
  hideDeleteButton?: boolean;
};

export const EditDataTypes = ({
  dataModelIds,
  connectedTaskId,
  existingDataTypeForTask,
  hideDeleteButton = false,
}: EditDataTypesProps) => {
  const { t } = useTranslation();
  const { bpmnDetails } = useBpmnContext();
  const [dataModelSelectVisible, setDataModelSelectVisible] = useState(false);

  useEffect(() => {
    setDataModelSelectVisible(false);
  }, [bpmnDetails.id]);

  return (
    <>
      {!existingDataTypeForTask && !dataModelSelectVisible ? (
        <StudioProperty.Button
          onClick={() => setDataModelSelectVisible(true)}
          property={t('process_editor.configuration_panel_set_data_model_link')}
          icon={<LinkIcon />}
        />
      ) : dataModelSelectVisible ? (
        <SelectDataTypes
          dataModelIds={dataModelIds}
          existingDataType={existingDataTypeForTask}
          connectedTaskId={connectedTaskId}
          onClose={() => setDataModelSelectVisible(false)}
          hideDeleteButton={hideDeleteButton}
        />
      ) : (
        <StudioProperty.Button
          aria-label={t('process_editor.configuration_panel_set_data_model', {
            dataModelName: existingDataTypeForTask,
          })}
          icon={<LinkIcon />}
          onClick={() => setDataModelSelectVisible(true)}
          property={t('process_editor.configuration_panel_set_data_model_label')}
          value={existingDataTypeForTask}
        />
      )}
    </>
  );
};
