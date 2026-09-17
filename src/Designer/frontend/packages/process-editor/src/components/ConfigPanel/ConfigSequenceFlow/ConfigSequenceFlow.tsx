import type { ReactElement } from 'react';
import { StudioSectionHeader, StudioParagraph } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { ConfigIcon } from '../ConfigContent/ConfigIcon';
import { BpmnTypeEnum } from '../../../enum/BpmnTypeEnum';
import { SequenceFlowExpression } from './SequenceFlowExpression';
import { useBpmnDiagramVersion } from '../../../hooks/useBpmnDiagramVersion';
import classes from './ConfigSequenceFlow.module.css';

export const ConfigSequenceFlow = (): ReactElement => {
  const { t } = useTranslation();
  useBpmnDiagramVersion();
  return (
    <>
      <StudioSectionHeader
        icon={<ConfigIcon type={BpmnTypeEnum.SequenceFlow} />}
        heading={{ text: t('process_editor.sequence_flow_configuration_panel_title'), level: 2 }}
      />
      <div className={classes.container}>
        <StudioParagraph spacing>
          {t('process_editor.sequence_flow_configuration_panel_explanation')}
        </StudioParagraph>
        <SequenceFlowExpression />
      </div>
    </>
  );
};
