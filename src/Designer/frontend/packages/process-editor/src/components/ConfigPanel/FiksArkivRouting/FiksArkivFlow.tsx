import { useId, useState, type ReactElement } from 'react';
import { StudioParagraph, StudioRadio, StudioRadioGroup } from '@studio/components';
import type { Element, Connection } from 'bpmn-js/lib/model/Types';
import type Modeling from 'bpmn-js/lib/features/modeling/Modeling';
import type BpmnFactory from 'bpmn-js/lib/features/modeling/BpmnFactory';
import { useTranslation } from 'react-i18next';
import { useBpmnContext } from '../../../contexts/BpmnContext';
import { useBpmnApiContext } from '../../../contexts/BpmnApiContext';
import {
  createOutcomeExpression,
  getFlowOutcome,
  hasKnownFiksArkivRouting,
  type FiksArkivOutcome,
} from '../../../utils/fiksArkivRouting';
import { SequenceFlowExpression } from '../ConfigSequenceFlow/SequenceFlowExpression';
import { FiksArkivRoutingStatus } from './FiksArkivRoutingStatus';
import classes from './FiksArkivRouting.module.css';
import { useFocusInput } from '../../../hooks/useFocusInput';

export function FiksArkivFlow({ flow }: { flow: Connection }): ReactElement {
  const { t } = useTranslation();
  const name = useId();
  const focusInput = useFocusInput();
  const { modelerRef } = useBpmnContext();
  const { fiksArkivRouting } = useBpmnApiContext();
  const [showCustomRule, setShowCustomRule] = useState(false);
  const outcome = getFlowOutcome(flow, fiksArkivRouting);
  const known = hasKnownFiksArkivRouting(fiksArkivRouting);
  const selectOutcome = (selected: FiksArkivOutcome): void => {
    const modeling = modelerRef.current.get<Modeling>('modeling');
    const factory = modelerRef.current.get<BpmnFactory>('bpmnFactory');
    modeling.updateProperties(flow, {
      conditionExpression: factory.create('bpmn:FormalExpression', {
        body: JSON.stringify(createOutcomeExpression(selected, fiksArkivRouting)),
      }),
    });
    setShowCustomRule(false);
  };
  return (
    <div className={classes.content} ref={focusInput}>
      <StudioParagraph>
        {t('process_editor.fiks_arkiv_routing.destination', {
          task: flow.target?.businessObject?.name || flow.target?.id,
        })}
      </StudioParagraph>
      {known && (
        <StudioRadioGroup legend={t('process_editor.fiks_arkiv_routing.choose_outcome')}>
          {(['success', 'failure'] as const).map((value) => (
            <StudioRadio
              key={value}
              name={name}
              value={value}
              checked={!showCustomRule && outcome === value}
              onChange={() => selectOutcome(value)}
              label={t(`process_editor.fiks_arkiv_routing.${value}`)}
              description={t(`process_editor.fiks_arkiv_routing.${value}_description`)}
            />
          ))}
          <StudioRadio
            name={name}
            value='custom'
            checked={showCustomRule || outcome === 'custom'}
            onChange={() => setShowCustomRule(true)}
            label={t('process_editor.fiks_arkiv_routing.custom')}
          />
        </StudioRadioGroup>
      )}
      {known && (showCustomRule || outcome === 'custom') && <SequenceFlowExpression />}
      <FiksArkivRoutingStatus gateway={flow.source as Element} />
      {!known && <SequenceFlowExpression />}
      <StudioParagraph data-size='sm'>
        {t('process_editor.fiks_arkiv_routing.technical_failure')}
      </StudioParagraph>
    </div>
  );
}
