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

export const ConfigGateway = (): React.ReactElement => {
  const { t } = useTranslation();
  const { allDataModelIds } = useBpmnApiContext();
  const { connectedDataTypeId, setConnectedDataTypeId } = useConnectedDataType();

  // A data model the gateway already points at is offered even when it is no longer in the app, so
  // that opening the panel cannot quietly drop a value the developer never touched.
  const dataModelOptions: string[] = ArrayUtils.removeDuplicates(
    ArrayUtils.removeEmptyStrings([...(allDataModelIds ?? []), connectedDataTypeId]),
  );

  // `null` rather than `undefined`: Suggestion treats `undefined` as uncontrolled and falls back to
  // the selection it kept itself, so a cleared gateway would keep showing the model it had.
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
        <StudioSuggestion
          description={t(
            'process_editor.configuration_panel_gateway_connected_data_type_description',
          )}
          emptyText={t('process_editor.configuration_panel_gateway_no_data_model_to_select')}
          filter={() => true}
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
