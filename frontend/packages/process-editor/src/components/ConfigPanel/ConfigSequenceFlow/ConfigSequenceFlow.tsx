import React, { useState } from 'react';
import { BooleanExpression, StudioExpression, StudioSectionHeader } from '@studio/components';
import { useBpmnContext } from '../../../contexts/BpmnContext';

import classes from './ConfigSequenceFlow.module.css';
import { Paragraph } from '@digdir/design-system-react';
import { BpmnExpressionModeler } from '../../../utils/bpmn/BpmnExpressionModeler';
import { useExpressionTexts } from 'app-shared/components/Expression/useExpressionTexts';

export const ConfigSequenceFlow = (): React.ReactElement => {
  const { bpmnDetails } = useBpmnContext();
  const texts = useExpressionTexts();
  const expressionModeler = new BpmnExpressionModeler(bpmnDetails.element);
  const [expression, setExpression] = useState<BooleanExpression>(
    expressionModeler.conditionExpression,
  );

  const addExpressionToSequenceFlow = (expression: BooleanExpression): void => {
    const stringifyExpression = JSON.stringify(expression);
    const newExpressionElement = expressionModeler.createExpressionElement(stringifyExpression);

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
          showAddSubexpression={false}
          expression={expression}
          onChange={(updatedExpression: BooleanExpression) => {
            setExpression(updatedExpression);
            addExpressionToSequenceFlow(updatedExpression);
          }}
          texts={texts}
          dataLookupOptions={['gatewayAction']}
        />
      </div>
    </>
  );
};
