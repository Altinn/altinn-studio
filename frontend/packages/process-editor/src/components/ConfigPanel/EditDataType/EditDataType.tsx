import React, { useEffect, useState } from 'react';
import { StudioProperty } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { LinkIcon } from '@studio/icons';
import { SelectDataType } from './SelectDataType';
import classes from './EditDataType.module.css';
import { useBpmnContext } from '../../../contexts/BpmnContext';

export type EditDataTypeProps = {
  dataModelIds: string[];
  connectedTaskId: string;
  existingDataTypeForTask: string | undefined;
  hideDeleteButton?: boolean;
};

export const EditDataType = ({
  dataModelIds,
  connectedTaskId,
  existingDataTypeForTask,
  hideDeleteButton = false,
}: EditDataTypeProps) => {
  const { t } = useTranslation();
  const { bpmnDetails } = useBpmnContext();
  const [dataModelSelectVisible, setDataModelSelectVisible] = useState(false);

  useEffect(() => {
    setDataModelSelectVisible(false);
  }, [bpmnDetails.id]);

  const definedValueWithLinkIcon = (
    <span className={classes.definedValue}>
      <LinkIcon /> {existingDataTypeForTask}
    </span>
  );

  return (
    <>
      {!existingDataTypeForTask && !dataModelSelectVisible ? (
        <StudioProperty.Button
          onClick={() => setDataModelSelectVisible(true)}
          property={t('process_editor.configuration_panel_set_data_model_link')}
          size='small'
          icon={<LinkIcon />}
        />
      ) : dataModelSelectVisible ? (
        <SelectDataType
          dataModelIds={dataModelIds}
          existingDataType={existingDataTypeForTask}
          connectedTaskId={connectedTaskId}
          onClose={() => setDataModelSelectVisible(false)}
          hideDeleteButton={hideDeleteButton}
        />
      ) : (
        <StudioProperty.Button
          aria-label={t('process_editor.configuration_panel_set_data_model')}
          onClick={() => setDataModelSelectVisible(true)}
          property={t('process_editor.configuration_panel_set_data_model')}
          title={t('process_editor.configuration_panel_set_data_model')}
          value={definedValueWithLinkIcon}
        />
      )}
    </>
  );
};
