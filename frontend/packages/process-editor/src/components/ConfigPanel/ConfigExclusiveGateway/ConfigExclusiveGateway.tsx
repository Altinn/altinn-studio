import React from 'react';
import { StudioExpression, StudioSectionHeader } from '@studio/components';
import { useExpressionTexts } from 'app-shared/components/Expression/useExpressionTexts';
import type Modeling from 'bpmn-js/lib/features/modeling/Modeling';
import { useBpmnContext } from '../../../contexts/BpmnContext';
import _default from 'bpmn-js/lib/features/modeling';
import bpmnFactory = _default.bpmnFactory;
import { Moddle } from 'bpmn-js/lib/model/Types';

export const ConfigExclusiveGateway = (): React.ReactElement => {
  const texts = useExpressionTexts();
  const expression: any = ['equals', 0, 0];
  const { modelerRef } = useBpmnContext();

  const modelerInstance = modelerRef.current;
  const modeling: Modeling = modelerInstance.get('modeling');

  const updateExpressionTest = () => {
    const moddle: Moddle = modelerInstance.get('moddle');

    const elementRegistry = modelerInstance.get('elementRegistry') as any;
    const connection = elementRegistry.get('Flow_1yj1b38');

    const newElement = moddle.create('bpmn:ExtensionElements', {
      body: 'some-expression',
    });

    modeling.updateProperties(connection, {
      conditionExpression: newElement,
    });
  };

  return (
    <>
      <button onClick={updateExpressionTest}>Update test</button>
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

      <StudioExpression
        expression={expression}
        onChange={() => {}}
        texts={texts}
        dataLookupOptions={null}
      ></StudioExpression>
    </>
  );
};
