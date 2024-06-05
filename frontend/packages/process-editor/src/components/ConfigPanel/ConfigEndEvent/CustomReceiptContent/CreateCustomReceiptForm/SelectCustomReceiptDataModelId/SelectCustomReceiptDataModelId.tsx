import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBpmnApiContext } from '../../../../../../contexts/BpmnApiContext';
import { getDataTypeFromLayoutSetsWithExistingId } from '../../../../../../utils/configPanelUtils';
import { Combobox } from '@digdir/design-system-react';

export type SelectCustomReceiptDataModelIdProps = {
  error: string;
  onChange: () => void;
};

export const SelectCustomReceiptDataModelId = ({
  error,
  onChange,
}: SelectCustomReceiptDataModelIdProps): React.ReactElement => {
  const { t } = useTranslation();
  const { layoutSets, existingCustomReceiptLayoutSetId, allDataModelIds } = useBpmnApiContext();

  const existingDataModelId: string = getDataTypeFromLayoutSetsWithExistingId(
    layoutSets,
    existingCustomReceiptLayoutSetId,
  );

  const [value, setValue] = useState(existingDataModelId ? [existingDataModelId] : []);

  return (
    <Combobox
      label={t('process_editor.configuration_panel_custom_receipt_select_data_model_label')}
      size='small'
      name='customReceiptDataModel'
      id='customReceiptDataModelSelect'
      error={error}
      value={value}
    >
      <Combobox.Empty>
        {t('process_editor.configuration_panel_no_data_model_to_select')}
      </Combobox.Empty>
      {allDataModelIds.map((option) => (
        <Combobox.Option
          value={option}
          key={option}
          onClick={() => {
            setValue([option]);
            onChange();
          }}
        >
          {option}
        </Combobox.Option>
      ))}
    </Combobox>
  );
};
