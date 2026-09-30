import { LogicalTupleOperator } from '../../../enums/LogicalTupleOperator';
import React from 'react';
import { useStudioExpressionContext } from '../../../StudioExpressionContext';
import { ToggleGroup } from '@digdir/designsystemet-react';
import classes from './LogicalOperatorToggle.module.css';
import { StudioParagraph } from '../../../../StudioParagraph';

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
      <StudioParagraph>{texts.logicalOperator}</StudioParagraph>
      <ToggleGroup data-toggle-group={texts.logicalOperator} value={operator} onChange={onChange}>
        {Object.values(LogicalTupleOperator).map((o) => (
          <ToggleGroup.Item key={o} value={o}>
            {texts.logicalTupleOperators[o]}
          </ToggleGroup.Item>
        ))}
      </ToggleGroup>
    </div>
  );
};
