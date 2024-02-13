import type {
  SimpleLogicalExpression,
  SimplifiedExpression,
} from '../../types/SimplifiedExpression';
import type { LogicalTupleOperator } from '../../enums/LogicalTupleOperator';
import {
  addDefaultSubExpression,
  changeOperator,
  changeSubExpression,
  changeSubExpressions,
  deleteSubExpression,
} from '../utils';
import type { SimpleSubExpression } from '../../types/SimpleSubExpression';
import classes from './LogicalExpressionEditor.module.css';
import { StudioButton } from '../../../StudioButton';
import type { ReactNode } from 'react';
import React, { Fragment, useContext } from 'react';
import { PlusIcon } from '@studio/icons';
import { SubExpression } from './SubExpression';
import { StudioExpressionContext } from '../../StudioExpressionContext';
import { LogicalOperatorToggle } from './LogicalOperatorToggle';
import { OperatorBetweenSubExpressions } from './OperatorBetweenSubExpressions';
import { Fieldset } from '@digdir/design-system-react';

export type LogicalExpressionEditorProps = {
  expression: SimpleLogicalExpression;
  onChange: (expression: SimplifiedExpression) => void;
};

export const LogicalExpressionEditor = ({ expression, onChange }: LogicalExpressionEditorProps) => {
  const { texts } = useContext(StudioExpressionContext);

  const handleOperatorChange = (operator: LogicalTupleOperator) =>
    onChange(changeOperator(expression, operator));

  const handleSubExpressionsChange = (subExpressions: SimpleSubExpression[]) =>
    onChange(changeSubExpressions(expression, subExpressions));

  const handleAddSubExpression = () => onChange(addDefaultSubExpression(expression));

  return (
    <Fieldset size='small' legend={texts.logicalOperation} hideLegend>
      <div className={classes.fieldsetContent}>
        <LogicalOperatorToggle
          disabled={expression.subExpressions.length < 2}
          onChange={handleOperatorChange}
          operator={expression.logicalOperator}
        />
        <SubExpressionList
          expressions={expression.subExpressions}
          onChange={handleSubExpressionsChange}
          componentBetween={<OperatorBetweenSubExpressions logicalExpression={expression} />}
        />
        <StudioButton
          icon={<PlusIcon />}
          onClick={handleAddSubExpression}
          size='small'
          variant='secondary'
        >
          {texts.addSubExpression}
        </StudioButton>
      </div>
    </Fieldset>
  );
};

type SubExpressionListProps = {
  expressions: SimpleSubExpression[];
  onChange: (subExpressions: SimpleSubExpression[]) => void;
  componentBetween: ReactNode;
};

const SubExpressionList = ({ expressions, onChange, componentBetween }: SubExpressionListProps) => {
  const { texts } = useContext(StudioExpressionContext);

  const handleSubExpressionChange = (index: number, expression: SimpleSubExpression) =>
    onChange(changeSubExpression(expressions, index, expression));

  const handleDeleteExpression = (index: number) =>
    onChange(deleteSubExpression(expressions, index));

  return (
    <>
      {expressions.map((expression, index) => (
        <Fragment key={index + ' ' + expression.toString()}>
          <SubExpression
            expression={expression}
            legend={texts.subExpression(index)}
            onChange={(exp) => handleSubExpressionChange(index, exp)}
            onDelete={() => handleDeleteExpression(index)}
          />
          {componentBetween}
        </Fragment>
      ))}
    </>
  );
};
