import React from 'react';

import classes from './ConfigPanel.module.css';
import { useTranslation } from 'react-i18next';
import { Paragraph, Alert, Heading } from '@digdir/design-system-react';
import { useBpmnContext } from '../../contexts/BpmnContext';
import { BpmnTypeEnum } from '../../enum/BpmnTypeEnum';
import { ConfigContent } from './ConfigContent';

export const ConfigPanel = (): React.ReactElement => {
  return <div className={classes.configPanel}>{<ConfigPanelContent />}</div>;
};

const ConfigPanelContent = (): React.ReactElement => {
  const { t } = useTranslation();
  const { bpmnDetails } = useBpmnContext();

  const noTaskSelected = bpmnDetails === null || bpmnDetails.type === BpmnTypeEnum.Process;
  if (noTaskSelected) {
    return (
      <BpmnAlert
        title='Ingen oppgave er valgt.'
        message={t('process_editor.configuration_panel_no_task')}
      />
    );
  }

  const isSupportedConfig = bpmnDetails.type === BpmnTypeEnum.Task;
  if (isSupportedConfig) {
    return <ConfigContent />;
  }

  return (
    <BpmnAlert
      title='Elementet er ikke støttet'
      message={t('process_editor.configuration_panel_element_not_supported')}
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
