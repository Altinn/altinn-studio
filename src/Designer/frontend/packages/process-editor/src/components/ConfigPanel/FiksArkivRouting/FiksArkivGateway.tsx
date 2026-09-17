import type { ReactElement } from 'react';
import { StudioHeading, StudioButton } from '@studio/components';
import type { Element, Connection } from 'bpmn-js/lib/model/Types';
import type Selection from 'diagram-js/lib/features/selection/Selection';
import { useTranslation } from 'react-i18next';
import { useBpmnContext } from '../../../contexts/BpmnContext';
import { useBpmnApiContext } from '../../../contexts/BpmnApiContext';
import { getFlowOutcome } from '../../../utils/fiksArkivRouting';
import { FiksArkivRoutingStatus } from './FiksArkivRoutingStatus';
import classes from './FiksArkivRouting.module.css';

export function FiksArkivGateway({ gateway }: { gateway: Element }): ReactElement {
  const { t } = useTranslation();
  const { modelerRef } = useBpmnContext();
  const { fiksArkivRouting } = useBpmnApiContext();
  return (
    <section className={classes.content} aria-label={t('process_editor.fiks_arkiv_routing.title')}>
      <StudioHeading level={3} data-size='xs'>
        {t('process_editor.fiks_arkiv_routing.title')}
      </StudioHeading>
      <ul className={classes.routes}>
        {(gateway.outgoing as Connection[]).map((flow) => (
          <li key={flow.id}>
            <StudioButton
              variant='secondary'
              className={classes.route}
              onClick={() => modelerRef.current.get<Selection>('selection').select(flow)}
            >
              <span>
                {t(`process_editor.fiks_arkiv_routing.${getFlowOutcome(flow, fiksArkivRouting)}`)}
              </span>
              <span aria-hidden='true'>→</span>
              <span>{flow.target?.businessObject?.name || flow.target?.id}</span>
            </StudioButton>
          </li>
        ))}
      </ul>
      <FiksArkivRoutingStatus gateway={gateway} />
    </section>
  );
}
