import React, { useState } from 'react';
import { Combobox } from '@digdir/design-system-react';
import { StudioButton } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { XMarkIcon } from '@studio/icons';
import classes from './SelectDataType2.module.css';
import { useAppMetadataQuery } from 'app-development/hooks/queries';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useBpmnContext } from '@altinn/process-editor/contexts/BpmnContext';
import { updateDataTypes, getExistingDataTypes } from './DataTypesToSignUtils';
import type Modeling from 'bpmn-js/lib/features/modeling/Modeling';
import type BpmnFactory from 'bpmn-js/lib/features/modeling/BpmnFactory';

export interface SelectDataType2Props {
  onClose: () => void;
}
export const SelectDataType2 = ({ onClose }: SelectDataType2Props) => {
  const { org, app } = useStudioUrlParams();
  const { data: appMetadata, isPending: appMetadataPending } = useAppMetadataQuery(org, app);
  const { bpmnDetails, modelerRef } = useBpmnContext();
  const modelerInstance = modelerRef.current;
  const modeling: Modeling = modelerInstance.get('modeling');
  const bpmnFactory: BpmnFactory = modelerInstance.get('bpmnFactory');
  const [value, setValue] = useState(() => getExistingDataTypes(bpmnDetails));

  const { t } = useTranslation();

  const handleValueChange = (dataTypes?: string[]) => {
    setValue(dataTypes);
    updateDataTypes(bpmnFactory, modeling, bpmnDetails, dataTypes);
  };

  return (
    <div className={classes.dataTypeSelect}>
      <Combobox
        multiple
        label={t('process_editor.configuration_panel_set_datatypes')}
        size='small'
        value={value}
        onValueChange={handleValueChange}
        loading={appMetadataPending}
        loadingLabel={t('process_editor.configuration_panel_set_datatypes')}
      >
        {appMetadata?.dataTypes?.map((dataType) => {
          return (
            <Combobox.Option
              key={dataType.id}
              value={dataType.id}
              description={dataType.id}
              displayValue={dataType.id}
            />
          );
        })}
      </Combobox>
      <div className={classes.buttons}>
        <StudioButton
          icon={<XMarkIcon />}
          onClick={onClose}
          size='small'
          title={t('general.close')}
          variant='secondary'
        />
      </div>
    </div>
  );
};
