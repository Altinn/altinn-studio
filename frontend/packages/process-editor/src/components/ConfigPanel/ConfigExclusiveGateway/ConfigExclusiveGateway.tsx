import React from 'react';
import { StudioExpression, StudioSectionHeader } from '@studio/components';
import { useExpressionTexts } from 'app-shared/components/Expression/useExpressionTexts';
import { useBpmnContext } from '../../../contexts/BpmnContext';
import { StudioModeller } from '../../../utils/ModellerHelper';

export const ConfigExclusiveGateway = (): React.ReactElement => {
  const texts = useExpressionTexts();
  const expression: any = ['equals', 0, 0];
  const { bpmnDetails } = useBpmnContext();

  // TODO Should type Expression argument to be specific to the expression we support
  const addExpressionToSequenceFlow = (expression: string): void => {
    const studioModeller = new StudioModeller(bpmnDetails.element);
    const parentElement = studioModeller.getElement();

    const newExpressionElement = studioModeller.createExpressionElement(expression);

    studioModeller.addChildElementToParent<{ conditionExpression: Element }>(parentElement, {
      conditionExpression: newExpressionElement,
    });
  };

  return (
    <>
      {/* TODO remove this button that is used just for testing during development */}
      <button
        onClick={() => addExpressionToSequenceFlow('["equals", ["gatewayAction"], "reject"]')}
      >
        Update test
      </button>
      <StudioSectionHeader
        heading={{
          text: 'Exclusive Gateway',
          level: 2,
        }}
        helpText={{
          text: 'This is the help text',
          title: 'Help text title',
        }}
      />
      {/*TODO use this editor to build the expression and send it to the addExpressionToSequenceFlow function*/}
      <StudioExpression
        expression={expression}
        onChange={() => {}}
        texts={texts}
        dataLookupOptions={null}
      ></StudioExpression>
    </>
  );
};
