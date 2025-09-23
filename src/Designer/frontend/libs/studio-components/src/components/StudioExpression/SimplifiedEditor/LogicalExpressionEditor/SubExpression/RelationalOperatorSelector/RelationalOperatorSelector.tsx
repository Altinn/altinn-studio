import type { RelationalOperator } from '../../../../types/RelationalOperator';
import { NumberRelationOperator } from '../../../../enums/NumberRelationOperator';
import { GeneralRelationOperator } from '../../../../enums/GeneralRelationOperator';
import { Paragraph } from '@digdir/designsystemet-react';
import React from 'react';
import { useStudioExpressionContext } from '../../../../StudioExpressionContext';
import { StudioSelect } from '../../../../../StudioSelect';

export type RelationalOperatorSelectorProps = {
  className?: string;
  isInEditMode: boolean;
  onChange: (operator: RelationalOperator) => void;
  operator: RelationalOperator;
};

const operatorList: RelationalOperator[] = [
  ...Object.values(GeneralRelationOperator),
  ...Object.values(NumberRelationOperator),
];

export const RelationalOperatorSelector = ({
  className,
  isInEditMode,
  onChange,
  operator,
}: RelationalOperatorSelectorProps): React.ReactElement => {
  const { texts } = useStudioExpressionContext();
  const { relationalOperators } = texts;

  if (!isInEditMode) return <Paragraph>{relationalOperators[operator]}</Paragraph>;

  const handleChange: React.ChangeEventHandler<HTMLSelectElement> = (event) =>
    onChange(event.target.value as RelationalOperator);

  return (
    <div className={className}>
      <StudioSelect label={texts.relationalOperator} value={operator} onChange={handleChange}>
        {operatorList.map((o) => (
          <option key={o} value={o}>
            {relationalOperators[o]}
          </option>
        ))}
      </StudioSelect>
    </div>
  );
};
