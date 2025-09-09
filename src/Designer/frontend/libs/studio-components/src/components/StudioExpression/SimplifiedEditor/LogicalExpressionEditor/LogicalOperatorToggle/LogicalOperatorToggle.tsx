import { LogicalTupleOperator } from '../../../enums/LogicalTupleOperator';
import React from 'react';
import { useStudioExpressionContext } from '../../../StudioExpressionContext';
import { Paragraph, ToggleGroup } from '@digdir/designsystemet-react';
import classes from './LogicalOperatorToggle.module.css';

export type LogicalOperatorToggleProps = {
  onChange: (operator: LogicalTupleOperator) => void;
  operator: LogicalTupleOperator;
};

export const LogicalOperatorToggle = ({
  operator,
  onChange,
}: LogicalOperatorToggleProps): React.ReactElement => {
  const { texts } = useStudioExpressionContext();

  return (
    <div className={classes.logicalOperatorToggle}>
      <Paragraph>{texts.logicalOperator}</Paragraph>
      <ToggleGroup value={operator} onChange={onChange}>
        {Object.values(LogicalTupleOperator).map((o) => (
          <ToggleGroup.Item key={o} value={o}>
            {texts.logicalTupleOperators[o]}
          </ToggleGroup.Item>
        ))}
      </ToggleGroup>
    </div>
  );
};
