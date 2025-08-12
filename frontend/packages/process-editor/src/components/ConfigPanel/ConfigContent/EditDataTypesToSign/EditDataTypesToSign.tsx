import React, { useState } from 'react';
import { StudioProperty } from '@studio/components-legacy';
import { useTranslation } from 'react-i18next';
import { LinkIcon } from '@studio/icons';
import { SelectDataTypesToSign } from './SelectDataTypesToSign';
import { useGetDataTypesToSign } from '../../../../hooks/dataTypesToSign/useGetDataTypesToSign';

export const EditDataTypesToSign = () => {
  const { t } = useTranslation();
  const selectedDataTypes = useGetDataTypesToSign();

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
      icon={<LinkIcon />}
      value={selectedDataTypes?.map((dataType: string) => (
        <div key={dataType}>{dataType}</div>
      ))}
    />
  );
};
