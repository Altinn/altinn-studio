import React, { useEffect, useState } from 'react';
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
  const [dataTypesToSignSelectVisible, setDataTypesToSignSelectVisible] = useState(false);

  useEffect(() => {
    setDataTypesToSignSelectVisible(false);
  }, [bpmnDetails]);

  const selectedDataTypes = getSelectedDataTypes(bpmnDetails);

  return (
    <>
      {!selectedDataTypes.length && !dataTypesToSignSelectVisible ? (
        <StudioProperty.Button
          onClick={() => setDataTypesToSignSelectVisible(true)}
          property={t('process_editor.configuration_panel_set_data_types_to_sign_link')}
          size='small'
          icon={<LinkIcon />}
        />
      ) : dataTypesToSignSelectVisible ? (
        <SelectDataTypesToSign onClose={() => setDataTypesToSignSelectVisible(false)} />
      ) : (
        <StudioProperty.Button
          aria-label={t('process_editor.configuration_panel_set_data_types_to_sign')}
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
      )}
    </>
  );
};
