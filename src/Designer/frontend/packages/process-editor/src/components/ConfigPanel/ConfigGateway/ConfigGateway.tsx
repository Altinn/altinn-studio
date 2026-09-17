import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  StudioSectionHeader,
  StudioSuggestion,
  type StudioSuggestionItem,
} from '@studio/components';
import { ArrayUtils } from '@studio/pure-functions';
import { useBpmnApiContext } from '../../../contexts/BpmnApiContext';
import { BpmnTypeEnum } from '../../../enum/BpmnTypeEnum';
import { ConfigIcon } from '../ConfigContent/ConfigIcon';
import { useConnectedDataType } from './useConnectedDataType';
import classes from './ConfigGateway.module.css';
import { useBpmnContext } from '../../../contexts/BpmnContext';
import { isFiksArkivGateway } from '../../../utils/fiksArkivRouting';
import { FiksArkivGateway } from '../FiksArkivRouting/FiksArkivGateway';
import { useBpmnDiagramVersion } from '../../../hooks/useBpmnDiagramVersion';

export const ConfigGateway = (): React.ReactElement => {
  const { t } = useTranslation();
  const { bpmnDetails } = useBpmnContext();
  useBpmnDiagramVersion();
  const { allDataModelIds } = useBpmnApiContext();
  const { connectedDataTypeId, setConnectedDataTypeId } = useConnectedDataType();

  // A data model the gateway already points at stays selectable even when the app no longer has it.
  const dataModelOptions: string[] = ArrayUtils.removeDuplicates(
    ArrayUtils.removeEmptyStrings([...(allDataModelIds ?? []), connectedDataTypeId]),
  );

  // `null` rather than `undefined`, which Suggestion treats as uncontrolled.
  const selected: StudioSuggestionItem | null = connectedDataTypeId
    ? { value: connectedDataTypeId, label: connectedDataTypeId }
    : null;

  const handleSelectedChange = (item: StudioSuggestionItem | null): void => {
    setConnectedDataTypeId(item?.value ?? '');
  };

  return (
    <>
      <StudioSectionHeader
        icon={<ConfigIcon type={BpmnTypeEnum.ExclusiveGateway} />}
        heading={{
          text: t('process_editor.configuration_panel_gateway'),
          level: 2,
        }}
        helpText={{
          text: t('process_editor.configuration_panel_gateway_help_text'),
          title: t('process_editor.configuration_panel_gateway_help_text_title'),
        }}
      />
      <div className={classes.container}>
        {isFiksArkivGateway(bpmnDetails.element) && (
          <FiksArkivGateway gateway={bpmnDetails.element} />
        )}
        <StudioSuggestion
          description={t(
            'process_editor.configuration_panel_gateway_connected_data_type_description',
          )}
          emptyText={t('process_editor.configuration_panel_no_data_model_to_select')}
          label={t('process_editor.configuration_panel_gateway_connected_data_type_label')}
          multiple={false}
          onSelectedChange={handleSelectedChange}
          selected={selected}
        >
          {dataModelOptions.map((dataModelId) => (
            <StudioSuggestion.Option key={dataModelId} label={dataModelId} value={dataModelId}>
              {dataModelId}
            </StudioSuggestion.Option>
          ))}
        </StudioSuggestion>
      </div>
    </>
  );
};
