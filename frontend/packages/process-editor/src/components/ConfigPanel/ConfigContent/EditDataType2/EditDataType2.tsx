import React, { useEffect, useState } from 'react';
import { useBpmnContext } from '../../../../contexts/BpmnContext';
import { StudioProperty } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { LinkIcon } from '@studio/icons';
import { SelectDataType2 } from './SelectDataType2';
import classes from './EditDataType2.module.css';
import { getExistingDataTypes } from './DataTypesToSignUtils';

export const EditDataType2 = () => {
  const { t } = useTranslation();
  const { bpmnDetails } = useBpmnContext();
  const [dataModelSelectVisible, setDataModelSelectVisible] = useState(false);

  useEffect(() => {
    setDataModelSelectVisible(false);
  }, [bpmnDetails]);

  const existingDataTypes = getExistingDataTypes(bpmnDetails);

  return (
    <>
      {!existingDataTypes.length && !dataModelSelectVisible ? (
        <StudioProperty.Button
          onClick={() => setDataModelSelectVisible(true)}
          property={t('process_editor.configuration_panel_set_datatypes_link')}
          size='small'
          icon={<LinkIcon />}
          className={classes.datamodelUndefined}
        />
      ) : dataModelSelectVisible ? (
        <SelectDataType2 onClose={() => setDataModelSelectVisible(false)} />
      ) : (
        <StudioProperty.Button
          aria-label={t('process_editor.configuration_panel_set_datatypes')}
          onClick={() => setDataModelSelectVisible(true)}
          property={t('process_editor.configuration_panel_set_datatypes')}
          title={t('process_editor.configuration_panel_set_datatypes')}
          value={
            <span className={classes.dataTypes}>
              {existingDataTypes?.map((dataType) => (
                <div key={dataType} className={classes.dataType}>
                  {dataType}
                </div>
              ))}
            </span>
          }
          className={classes.datamodelDefined}
        />
      )}
    </>
  );
};
