import React, { useState } from 'react';
import { useBpmnContext } from '../../../contexts/BpmnContext';
import { StudioProperty } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { LinkIcon } from '@studio/icons';
import { SelectDataTypesToSign } from './SelectDataTypesToSign';
import classes from './EditDataTypesToSign.module.css';
import { getSelectedDataTypes } from './DataTypesToSignUtils';

export const EditDataTypesToSign = () => {
  const { t } = useTranslation();
  const { bpmnDetails } = useBpmnContext();
  const selectedDataTypes = getSelectedDataTypes(bpmnDetails);

  const [dataTypesToSignSelectVisible, setDataTypesToSignSelectVisible] = useState(
    !selectedDataTypes.length,
  );

  return dataTypesToSignSelectVisible ? (
    <SelectDataTypesToSign onClose={() => setDataTypesToSignSelectVisible(false)} />
  ) : (
    <StudioProperty.Button
      onClick={() => setDataTypesToSignSelectVisible(true)}
      property={t('process_editor.configuration_panel_set_data_types_to_sign')}
      title={t('process_editor.configuration_panel_set_data_types_to_sign')}
      value={
        <>
          {selectedDataTypes?.map((dataType) => (
            <div key={dataType} className={classes.dataType}>
              <LinkIcon /> {dataType}
            </div>
          ))}
        </>
      }
    />
  );
};
