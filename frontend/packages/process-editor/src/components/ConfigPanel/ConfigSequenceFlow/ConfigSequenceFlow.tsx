import React from 'react';
import { StudioButton, StudioSectionHeader } from '@studio/components';
import { useBpmnContext } from '../../../contexts/BpmnContext';
import { SequenceFlowExpressionBuilder } from './SequenceFlowExpressionBuilder';

import classes from './ConfigSequenceFlow.module.css';
import { Paragraph } from '@digdir/design-system-react';
import { BpmnExpressionModeler } from '../../../utils/bpmn/BpmnExpressionModeler';

export const ConfigSequenceFlow = (): React.ReactElement => {
  const { bpmnDetails } = useBpmnContext();
  const [openExpressionBuilder, setOpenExpressionBuilder] = React.useState(false);
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
        {expressionModeler.hasConditionExpression || openExpressionBuilder ? (
          <SequenceFlowExpressionBuilder
            expression={expressionModeler.conditionExpression}
            onSave={addExpressionToSequenceFlow}
            onDelete={deleteExpression}
          />
        ) : (
          <StudioButton variant='primary' onClick={() => setOpenExpressionBuilder(true)}>
            Legg til dynamikk
          </StudioButton>
        )}
      </div>
    </>
  );
};
