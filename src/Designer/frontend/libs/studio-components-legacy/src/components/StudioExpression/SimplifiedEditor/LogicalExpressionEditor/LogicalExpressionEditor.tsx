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
import React, { Fragment, type ReactNode } from 'react';
import { PlusIcon } from '../../../../../../studio-icons';
import { Subexpression } from './SubExpression';
import { useStudioExpressionContext } from '../../StudioExpressionContext';
import { LogicalOperatorToggle } from './LogicalOperatorToggle';
import { OperatorBetweenSubexpressions } from './OperatorBetweenSubexpressions';
import { Fieldset } from '@digdir/designsystemet-react';
import { type UseUniqueKey, useUniqueKeys } from 'libs/studio-hooks/src';

export type LogicalExpressionEditorProps = {
  expression: SimpleLogicalExpression;
  showAddSubexpression?: boolean;
  onChange: (expression: SimplifiedExpression) => void;
};

export const LogicalExpressionEditor = ({
  expression,
  showAddSubexpression = true,
  onChange,
}: LogicalExpressionEditorProps): React.ReactElement => {
  const { texts } = useStudioExpressionContext();
  const { subexpressions, logicalOperator } = expression;

  const { removeUniqueKey, addUniqueKey, getUniqueKey } = useUniqueKeys({
    numberOfKeys: subexpressions.length,
  });

  const handleOperatorChange = (operator: LogicalTupleOperator): void =>
    onChange(changeOperator(expression, operator));

  const handleSubexpressionsChange = (newSubexpressions: SimpleSubexpression[]): void =>
    onChange(changeSubexpressions(expression, newSubexpressions));

  const handleAddSubexpression: React.MouseEventHandler<HTMLButtonElement> = () => {
    onChange(addDefaultSubexpression(expression));
    addUniqueKey();
  };

  return (
    <Fieldset size='small' legend={texts.logicalOperation} hideLegend>
      <div className={classes.fieldsetContent}>
        {subexpressions.length > 1 && (
          <LogicalOperatorToggle onChange={handleOperatorChange} operator={logicalOperator} />
        )}
        <SubexpressionList
          componentBetween={
            showAddSubexpression ? (
              <OperatorBetweenSubexpressions logicalExpression={expression} />
            ) : undefined
          }
          expressions={subexpressions}
          getUniqueKey={getUniqueKey}
          removeUniqueKey={removeUniqueKey}
          onChange={handleSubexpressionsChange}
        />
        {showAddSubexpression && (
          <StudioButton icon={<PlusIcon />} onClick={handleAddSubexpression} variant='secondary'>
            {texts.addSubexpression}
          </StudioButton>
        )}
      </div>
    </Fieldset>
  );
};

type SubexpressionListProps = {
  componentBetween: ReactNode;
  expressions: SimpleSubexpression[];
  onChange: (subexpressions: SimpleSubexpression[]) => void;
} & Pick<UseUniqueKey, 'getUniqueKey' | 'removeUniqueKey'>;

const SubexpressionList = ({
  expressions,
  onChange,
  componentBetween,
  getUniqueKey,
  removeUniqueKey,
}: SubexpressionListProps): React.ReactElement => {
  const { texts } = useStudioExpressionContext();

  const handleSubexpressionChange = (index: number, expression: SimpleSubexpression): void =>
    onChange(changeSubexpression(expressions, index, expression));

  const handleDeleteExpression = (index: number): void => {
    onChange(deleteSubexpression(expressions, index));
    removeUniqueKey(index);
  };

  return (
    <>
      {expressions.map((expression, index) => (
        <Fragment key={getUniqueKey(index)}>
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
