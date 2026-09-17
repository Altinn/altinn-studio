import type { Connection, Element } from 'bpmn-js/lib/model/Types';
import type { ReactElement } from 'react';
import { StudioSectionHeader, StudioParagraph } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { useBpmnContext } from '../../../contexts/BpmnContext';
import { ConfigIcon } from '../ConfigContent/ConfigIcon';
import { BpmnTypeEnum } from '../../../enum/BpmnTypeEnum';
import { isFiksArkivGateway } from '../../../utils/fiksArkivRouting';
import { FiksArkivFlow } from '../FiksArkivRouting/FiksArkivFlow';
import { SequenceFlowExpression } from './SequenceFlowExpression';
import { useBpmnDiagramVersion } from '../../../hooks/useBpmnDiagramVersion';
import classes from './ConfigSequenceFlow.module.css';

export const ConfigSequenceFlow = (): ReactElement => {
  const { t } = useTranslation();
  const { bpmnDetails } = useBpmnContext();
  useBpmnDiagramVersion();
  const flow = bpmnDetails.element as Connection;
  return (
    <>
      <StudioSectionHeader
        icon={<ConfigIcon type={BpmnTypeEnum.SequenceFlow} />}
        heading={{ text: t('process_editor.sequence_flow_configuration_panel_title'), level: 2 }}
      />
      <div className={classes.container}>
        {isFiksArkivGateway(flow?.source as Element) ? (
          <FiksArkivFlow flow={flow} />
        ) : (
          <>
            <StudioParagraph spacing>
              {t('process_editor.sequence_flow_configuration_panel_explanation')}
            </StudioParagraph>
            <SequenceFlowExpression />
          </>
        )}
      </div>
    </>
  );
};
