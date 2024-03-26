import type { SimplifiedExpression } from '../../types/SimplifiedExpression';
import { DEFAULT_LOGICAL_EXPRESSION } from '../../config';
import { StudioBooleanToggleGroup } from '../../../StudioBooleanToggleGroup';
import { StudioButton } from '../../../StudioButton';
import React from 'react';
import classes from './BooleanEditor.module.css';
import { useStudioExpressionContext } from '../../StudioExpressionContext';

export type BooleanEditorProps = {
  expression: boolean;
  onChange: (expression: SimplifiedExpression) => void;
};

export const BooleanEditor = ({ expression, onChange }: BooleanEditorProps) => {
  const { texts } = useStudioExpressionContext();

  const handleSwitchToLogical = () => onChange(DEFAULT_LOGICAL_EXPRESSION);

  return (
    <div className={classes.booleanEditor}>
      <StudioBooleanToggleGroup
        className={classes.toggle}
        falseLabel={texts.false}
        onChange={onChange}
        size='small'
        trueLabel={texts.true}
        value={expression}
      />
      <StudioButton variant='secondary' size='small' onClick={handleSwitchToLogical}>
        {texts.transformToLogical}
      </StudioButton>
    </div>
  );
};
