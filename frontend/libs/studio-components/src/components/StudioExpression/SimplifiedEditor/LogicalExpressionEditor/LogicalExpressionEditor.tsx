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
import type { MutableRefObject, ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import React, { Fragment, useContext } from 'react';
import { PlusIcon } from '@studio/icons';
import { SubExpression } from './SubExpression';
import { StudioExpressionContext } from '../../StudioExpressionContext';
import { LogicalOperatorToggle } from './LogicalOperatorToggle';
import { OperatorBetweenSubExpressions } from './OperatorBetweenSubExpressions';
import { Fieldset } from '@digdir/design-system-react';
import { v4 as uuidv4 } from 'uuid';
import { ArrayUtils } from '@studio/pure-functions';

export type LogicalExpressionEditorProps = {
  expression: SimpleLogicalExpression;
  onChange: (expression: SimplifiedExpression) => void;
};

export const LogicalExpressionEditor = ({ expression, onChange }: LogicalExpressionEditorProps) => {
  const { texts } = useContext(StudioExpressionContext);
  const internalIds = useRef<string[]>([]); // Used to keep track of the order of the subcomponents
  const { subExpressions, logicalOperator } = expression;

  const areInternalIdsInSync = internalIds.current.length === subExpressions.length;
  if (!areInternalIdsInSync) {
    internalIds.current = [];
    for (let i = 0; i < subExpressions.length; i++) {
      internalIds.current.push(uuidv4());
    }
  }

  const handleOperatorChange = (operator: LogicalTupleOperator) =>
    onChange(changeOperator(expression, operator));

  const handleSubExpressionsChange = (newSubexpressions: SimpleSubExpression[]) =>
    onChange(changeSubExpressions(expression, newSubexpressions));

  const handleAddSubExpression = () => {
    onChange(addDefaultSubExpression(expression));
    internalIds.current.push(uuidv4());
  };

  return (
    <Fieldset size='small' legend={texts.logicalOperation} hideLegend>
      <div className={classes.fieldsetContent}>
        {subExpressions.length > 1 && (
          <LogicalOperatorToggle onChange={handleOperatorChange} operator={logicalOperator} />
        )}
        <SubExpressionList
          componentBetween={<OperatorBetweenSubExpressions logicalExpression={expression} />}
          expressions={subExpressions}
          internalIds={internalIds}
          onChange={handleSubExpressionsChange}
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
  componentBetween: ReactNode;
  expressions: SimpleSubExpression[];
  internalIds: MutableRefObject<string[]>;
  onChange: (subExpressions: SimpleSubExpression[]) => void;
};

const SubExpressionList = ({
  expressions,
  onChange,
  componentBetween,
  internalIds,
}: SubExpressionListProps) => {
  const { texts } = useContext(StudioExpressionContext);

  const handleSubExpressionChange = (index: number, expression: SimpleSubExpression) =>
    onChange(changeSubExpression(expressions, index, expression));

  const handleDeleteExpression = (index: number) => {
    onChange(deleteSubExpression(expressions, index));
    internalIds.current = ArrayUtils.removeItemByIndex(internalIds.current, index);
  };

  return (
    <>
      {expressions.map((expression, index) => (
        <Fragment key={internalIds.current[index]}>
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
