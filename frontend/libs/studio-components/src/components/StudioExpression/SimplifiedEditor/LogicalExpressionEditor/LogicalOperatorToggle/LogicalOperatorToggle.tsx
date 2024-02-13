import { LogicalTupleOperator } from '../../../enums/LogicalTupleOperator';
import React, { useContext } from 'react';
import { StudioExpressionContext } from '../../../StudioExpressionContext';
import { Paragraph, ToggleGroup } from '@digdir/design-system-react';
import classes from './LogicalOperatorToggle.module.css';

export type LogicalOperatorToggleProps = {
  disabled: boolean;
  onChange: (operator: LogicalTupleOperator) => void;
  operator: LogicalTupleOperator;
};

export const LogicalOperatorToggle = ({
  operator,
  onChange,
  disabled,
}: LogicalOperatorToggleProps) => {
  const { texts } = useContext(StudioExpressionContext);

  const title = disabled ? texts.disabledLogicalOperator : undefined;

  return (
    <div className={classes.logicalOperatorToggle}>
      <Paragraph size='small'>{texts.logicalOperator}</Paragraph>
      <ToggleGroup value={operator} onChange={onChange} size='small' title={title}>
        {Object.values(LogicalTupleOperator).map((o) => (
          <ToggleGroup.Item key={o} value={o} disabled={disabled}>
            {texts.logicalTupleOperators[o]}
          </ToggleGroup.Item>
        ))}
      </ToggleGroup>
    </div>
  );
};
