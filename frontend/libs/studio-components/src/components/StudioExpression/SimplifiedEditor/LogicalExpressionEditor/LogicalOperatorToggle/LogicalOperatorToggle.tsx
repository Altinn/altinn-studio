import { LogicalTupleOperator } from '../../../enums/LogicalTupleOperator';
import React from 'react';
import { useStudioExpressionContext } from '../../../StudioExpressionContext';
import { Paragraph, ToggleGroup } from '@digdir/designsystemet-react';
import classes from './LogicalOperatorToggle.module.css';

export type LogicalOperatorToggleProps = {
  onChange: (operator: LogicalTupleOperator) => void;
  operator: LogicalTupleOperator;
};

export const LogicalOperatorToggle = ({ operator, onChange }: LogicalOperatorToggleProps) => {
  const { texts } = useStudioExpressionContext();

  return (
    <div className={classes.logicalOperatorToggle}>
      <Paragraph size='small'>{texts.logicalOperator}</Paragraph>
      <ToggleGroup value={operator} onChange={onChange} size='small'>
        {Object.values(LogicalTupleOperator).map((o) => (
          <ToggleGroup.Item key={o} value={o}>
            {texts.logicalTupleOperators[o]}
          </ToggleGroup.Item>
        ))}
      </ToggleGroup>
    </div>
  );
};
