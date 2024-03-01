import type {
  SimpleLogicalExpression,
  SimplifiedExpression,
} from '../../types/SimplifiedExpression';
import type { LogicalTupleOperator } from '../../enums/LogicalTupleOperator';
import {
  addDefaultSubexpression,
  changeOperator,
  changeSubexpression,
  changeSubexpressions,
  deleteSubexpression,
} from '../utils';
import type { SimpleSubexpression } from '../../types/SimpleSubexpression';
import classes from './LogicalExpressionEditor.module.css';
import { StudioButton } from '../../../StudioButton';
import type { MutableRefObject, ReactNode } from 'react';
import React, { Fragment, useRef } from 'react';
import { PlusIcon } from '@studio/icons';
import { Subexpression } from './SubExpression';
import { useStudioExpressionContext } from '../../StudioExpressionContext';
import { LogicalOperatorToggle } from './LogicalOperatorToggle';
import { OperatorBetweenSubexpressions } from './OperatorBetweenSubexpressions';
import { Fieldset } from '@digdir/design-system-react';
import { v4 as uuidv4 } from 'uuid';
import { ArrayUtils } from '@studio/pure-functions';

export type LogicalExpressionEditorProps = {
  expression: SimpleLogicalExpression;
  onChange: (expression: SimplifiedExpression) => void;
};

export const LogicalExpressionEditor = ({ expression, onChange }: LogicalExpressionEditorProps) => {
  const { texts } = useStudioExpressionContext();
  const internalIds = useRef<string[]>([]); // Used to keep track of the order of the subcomponents
  const { subexpressions, logicalOperator } = expression;

  const areInternalIdsInSync = internalIds.current.length === subexpressions.length;
  if (!areInternalIdsInSync) {
    internalIds.current = [];
    for (let i = 0; i < subexpressions.length; i++) {
      internalIds.current.push(uuidv4());
    }
  }

  const handleOperatorChange = (operator: LogicalTupleOperator) =>
    onChange(changeOperator(expression, operator));

  const handleSubexpressionsChange = (newSubexpressions: SimpleSubexpression[]) =>
    onChange(changeSubexpressions(expression, newSubexpressions));

  const handleAddSubexpression = () => {
    onChange(addDefaultSubexpression(expression));
    internalIds.current.push(uuidv4());
  };

  return (
    <Fieldset size='small' legend={texts.logicalOperation} hideLegend>
      <div className={classes.fieldsetContent}>
        {subexpressions.length > 1 && (
          <LogicalOperatorToggle onChange={handleOperatorChange} operator={logicalOperator} />
        )}
        <SubexpressionList
          componentBetween={<OperatorBetweenSubexpressions logicalExpression={expression} />}
          expressions={subexpressions}
          internalIds={internalIds}
          onChange={handleSubexpressionsChange}
        />
        <StudioButton
          icon={<PlusIcon />}
          onClick={handleAddSubexpression}
          size='small'
          variant='secondary'
        >
          {texts.addSubexpression}
        </StudioButton>
      </div>
    </Fieldset>
  );
};

type SubexpressionListProps = {
  componentBetween: ReactNode;
  expressions: SimpleSubexpression[];
  internalIds: MutableRefObject<string[]>;
  onChange: (subexpressions: SimpleSubexpression[]) => void;
};

const SubexpressionList = ({
  expressions,
  onChange,
  componentBetween,
  internalIds,
}: SubexpressionListProps) => {
  const { texts } = useStudioExpressionContext();

  const handleSubexpressionChange = (index: number, expression: SimpleSubexpression) =>
    onChange(changeSubexpression(expressions, index, expression));

  const handleDeleteExpression = (index: number) => {
    onChange(deleteSubexpression(expressions, index));
    internalIds.current = ArrayUtils.removeItemByIndex(internalIds.current, index);
  };

  return (
    <>
      {expressions.map((expression, index) => (
        <Fragment key={internalIds.current[index]}>
          <Subexpression
            expression={expression}
            legend={texts.subexpression(index)}
            onChange={(exp) => handleSubexpressionChange(index, exp)}
            onDelete={() => handleDeleteExpression(index)}
          />
          {componentBetween}
        </Fragment>
      ))}
    </>
  );
};
