import React from 'react';
import { useTranslation } from 'react-i18next';
import { Paragraph, Alert, Heading } from '@digdir/designsystemet-react';
import { useBpmnContext } from '../../contexts/BpmnContext';
import { BpmnTypeEnum } from '../../enum/BpmnTypeEnum';
import { ConfigContent } from './ConfigContent';
import { ConfigEndEvent } from './ConfigEndEvent';
import { ConfigSurface } from '../ConfigSurface/ConfigSurface';
import { ConfigSequenceFlow } from './ConfigSequenceFlow';

export const ConfigPanel = (): React.ReactElement => {
  return (
    <ConfigSurface>
      <ConfigPanelContent />
    </ConfigSurface>
  );
};

const ConfigPanelContent = (): React.ReactElement => {
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

  const elementIsEndEvent = bpmnDetails.type === BpmnTypeEnum.EndEvent;
  if (elementIsEndEvent) {
    return <ConfigEndEvent />;
  }

  const shouldDisplaySequenceFlow = bpmnDetails.type === BpmnTypeEnum.SequenceFlow;
  if (shouldDisplaySequenceFlow) {
    return <ConfigSequenceFlow key={bpmnDetails.id} />;
  }

  const elementIsTask = bpmnDetails.type === BpmnTypeEnum.Task;
  if (elementIsTask) {
    return <ConfigContent key={bpmnDetails.id} />;
  }
  console.log('type:', bpmnDetails.type);
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
