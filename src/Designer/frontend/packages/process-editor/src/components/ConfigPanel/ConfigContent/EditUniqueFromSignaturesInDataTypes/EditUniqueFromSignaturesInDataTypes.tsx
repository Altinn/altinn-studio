import React, { useState } from 'react';
import { useBpmnContext } from '../../../../contexts/BpmnContext';
import { StudioProperty } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { PersonPencilIcon } from 'libs/studio-icons/src';
import { SelectUniqueFromSignaturesInDataTypes } from './SelectUniqueFromSignaturesInDataTypes';
import { getSelectedDataTypes } from './UniqueFromSignaturesInDataTypesUtils';
import { StudioModeler } from '../../../../utils/bpmnModeler/StudioModeler';

export const EditUniqueFromSignaturesInDataTypes = () => {
  const { t } = useTranslation();
  const { bpmnDetails } = useBpmnContext();
  const selectedDataTypes = getSelectedDataTypes(bpmnDetails);
  const existingDataTypeForTask = selectedDataTypes.length > 0;
  const [isSelectVisible, setIsSelectVisible] = useState(false);

  const studioModeler = new StudioModeler();
  const tasks = studioModeler.getAllTasksByType('bpmn:Task');
  const signingTasks = tasks
    .filter(
      ({
        businessObject: {
          extensionElements: { values },
        },
      }) => {
        const { signatureConfig } = values[0];
        return selectedDataTypes.includes(signatureConfig?.signatureDataType);
      },
    )
    .map(
      ({
        businessObject: {
          name,
          extensionElements: { values },
        },
      }) => {
        const { signatureConfig } = values[0];
        return {
          id: signatureConfig?.signatureDataType,
          name,
        };
      },
    );

  return (
    <>
      {!existingDataTypeForTask && !isSelectVisible ? (
        <StudioProperty.Button
          onClick={() => setIsSelectVisible(true)}
          property={t(
            'process_editor.configuration_panel_set_unique_from_signatures_in_data_types_link',
          )}
          icon={<PersonPencilIcon />}
        />
      ) : isSelectVisible ? (
        <SelectUniqueFromSignaturesInDataTypes onClose={() => setIsSelectVisible(false)} />
      ) : (
        <StudioProperty.Button
          onClick={() => setIsSelectVisible(true)}
          property={t(
            'process_editor.configuration_panel_set_unique_from_signatures_in_data_types',
          )}
          title={t('process_editor.configuration_panel_set_unique_from_signatures_in_data_types')}
          icon={<PersonPencilIcon />}
          value={signingTasks?.map((dataType) => (
            <div key={dataType.id}>{dataType.name}</div>
          ))}
        />
      )}
    </>
  );
};
