import React from 'react';
import { useTranslation } from 'react-i18next';
import { Paragraph, Alert, Heading } from '@digdir/design-system-react';
import { useBpmnContext } from '../../contexts/BpmnContext';
import { BpmnTypeEnum } from '../../enum/BpmnTypeEnum';
import { ConfigContent } from './ConfigContent';
import { ConfigEndEvent } from './ConfigEndEvent';
import type { LayoutSetConfig } from 'app-shared/types/api/LayoutSetsResponse';
import { shouldDisplayFeature } from 'app-shared/utils/featureToggleUtils';
import { ConfigSurface } from '../ConfigSurface/ConfigSurface';

export interface ConfigPanelProps {
  existingCustomReceiptName: string | undefined;
  onUpdateLayoutSet: (layoutSetIdToUpdate: string, layoutSetConfig: LayoutSetConfig) => void;
}

export const ConfigPanel = ({
  existingCustomReceiptName,
  onUpdateLayoutSet,
}: ConfigPanelProps): React.ReactElement => {
  return (
    <ConfigSurface>
      <ConfigPanelContent
        existingCustomReceiptName={existingCustomReceiptName}
        onUpdateLayoutSet={onUpdateLayoutSet}
      />
    </ConfigSurface>
  );
};

type ConfigPanelContentProps = ConfigPanelProps;
const ConfigPanelContent = ({
  existingCustomReceiptName,
  onUpdateLayoutSet,
}: ConfigPanelContentProps): React.ReactElement => {
  const { t } = useTranslation();
  const { bpmnDetails } = useBpmnContext();

  const noTaskSelected = bpmnDetails === null || bpmnDetails.type === BpmnTypeEnum.Process;
  if (noTaskSelected) {
    return (
      <BpmnAlert
        title={t('process_editor.configuration_panel_no_task_title')}
        message={t('process_editor.configuration_panel_no_task_message')}
      />
    );
  }

  const shouldDisplayEndEventConfig =
    shouldDisplayFeature('customizeEndEvent') && bpmnDetails.type === BpmnTypeEnum.EndEvent;
  if (shouldDisplayEndEventConfig) {
    return (
      <ConfigEndEvent
        existingCustomReceiptName={existingCustomReceiptName}
        onUpdateLayoutSet={onUpdateLayoutSet}
      />
    );
  }

  const isSupportedConfig = bpmnDetails.type === BpmnTypeEnum.Task;
  if (isSupportedConfig) {
    return <ConfigContent />;
  }

  return (
    <BpmnAlert
      title={t('process_editor.configuration_panel_element_not_supported_title')}
      message={t('process_editor.configuration_panel_element_not_supported_message')}
    />
  );
};

type BpmnAlertProps = {
  title: string;
  message: string;
};
const BpmnAlert = ({ title, message }: BpmnAlertProps): React.ReactElement => {
  return (
    <Alert>
      <Heading level={3} size='xxsmall' spacing>
        {title}
      </Heading>
      <Paragraph size='small'>{message}</Paragraph>
    </Alert>
  );
};
