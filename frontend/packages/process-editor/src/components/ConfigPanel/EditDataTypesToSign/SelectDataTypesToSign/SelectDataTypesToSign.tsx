import React, { useRef, useState } from 'react';
import { Combobox } from '@digdir/design-system-react';
import { StudioButton } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { XMarkIcon } from '@studio/icons';
import classes from './SelectDataTypesToSign.module.css';
import { useAppMetadataQuery } from 'app-development/hooks/queries';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useBpmnContext } from '@altinn/process-editor/contexts/BpmnContext';
import { updateDataTypes, getExistingDataTypes } from '../DataTypesToSignUtils';
import type Modeling from 'bpmn-js/lib/features/modeling/Modeling';
import type BpmnFactory from 'bpmn-js/lib/features/modeling/BpmnFactory';
import { AUTOSAVE_DEBOUNCE_INTERVAL_MILLISECONDS } from 'app-shared/constants';

export interface SelectDataTypesToSignProps {
  onClose: () => void;
}

export const SelectDataTypesToSign = ({ onClose }: SelectDataTypesToSignProps) => {
  const { org, app } = useStudioUrlParams();
  const { data: appMetadata, isPending: appMetadataPending } = useAppMetadataQuery(org, app);
  const { bpmnDetails, modelerRef } = useBpmnContext();
  const modelerInstance = modelerRef.current;
  const modeling: Modeling = modelerInstance.get('modeling');
  const bpmnFactory: BpmnFactory = modelerInstance.get('bpmnFactory');
  const [value, setValue] = useState<string[]>(() => getExistingDataTypes(bpmnDetails));

  const { t } = useTranslation();

  const autoSaveTimeoutRef = useRef(undefined);

  const debounceSave = (dataTypes: string[]) => {
    clearTimeout(autoSaveTimeoutRef.current);
    setTimeout(() => {
      updateDataTypes(bpmnFactory, modeling, bpmnDetails, dataTypes);
    }, AUTOSAVE_DEBOUNCE_INTERVAL_MILLISECONDS);
  };

  const handleValueChange = (dataTypes: string[]) => {
    setValue(dataTypes);
    debounceSave(dataTypes);
  };

  return (
    <div className={classes.dataTypeSelectAndButtons}>
      <Combobox
        label={t('process_editor.configuration_panel_set_data_types_to_sign')}
        value={value}
        description={t(
          'process_editor.configuration_panel_data_types_to_sign_selection_description',
        )}
        size='small'
        className={classes.dataTypeSelect}
        loading={appMetadataPending}
        loadingLabel={t('process_editor.configuration_panel_set_data_types_to_sign')}
        multiple
        onValueChange={handleValueChange}
      >
        <Combobox.Empty>
          {t('process_editor.configuration_panel_no_data_types_to_sign_to_select')}
        </Combobox.Empty>
        {appMetadata?.dataTypes?.map((dataType) => {
          return (
            <Combobox.Option key={dataType.id} value={dataType.id}>
              {dataType.id}
            </Combobox.Option>
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
