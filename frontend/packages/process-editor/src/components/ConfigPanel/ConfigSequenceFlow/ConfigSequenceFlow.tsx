import React from 'react';
import { StudioExpression, StudioSectionHeader } from '@studio/components';
import { useBpmnContext } from '../../../contexts/BpmnContext';

import classes from './ConfigSequenceFlow.module.css';
import { Paragraph } from '@digdir/design-system-react';
import { BpmnExpressionModeler } from '../../../utils/bpmn/BpmnExpressionModeler';
import { useExpressionTexts } from 'app-shared/components/Expression/useExpressionTexts';

export const ConfigSequenceFlow = (): React.ReactElement => {
  const { bpmnDetails } = useBpmnContext();
  const texts = useExpressionTexts();
  const expressionModeler = new BpmnExpressionModeler(bpmnDetails.element);

  const addExpressionToSequenceFlow = (expression: string): void => {
    const newExpressionElement = expressionModeler.createExpressionElement(expression);

    expressionModeler.addChildElementToParent({
      conditionExpression: newExpressionElement,
    });
  };

  const deleteExpression = (): void => {
    expressionModeler.updateElementProperties({
      conditionExpression: null,
    });
  };

  return (
    <>
      <StudioSectionHeader
        heading={{
          text: 'Flytkontroll',
          level: 2,
        }}
      />
      <div className={classes.container}>
        <Paragraph spacing>
          Med Flytkontroll-verktøyet kan du kontrollere flyten ut av en gateway basert på
          brukerhandling utført ved hjelp av et utrykk.
        </Paragraph>
        <StudioExpression
          expression={['equals', ['gatewayAction'], 'reject']}
          onChange={(e) => {
            console.log(e);
          }}
          texts={texts}
          dataLookupOptions={['gatewayAction']}
        />
      </div>
    </>
  );
};
