import type { RelationalOperator } from '../../../../types/RelationalOperator';
import { NumberRelationOperator } from '../../../../enums/NumberRelationOperator';
import { GenericRelationOperator } from '../../../../enums/GenericRelationOperator';
import { NativeSelect, Paragraph } from '@digdir/design-system-react';
import React, { useContext } from 'react';
import { StudioExpressionContext } from '../../../../StudioExpressionContext';

export type RelationalOperatorSelectorProps = {
  className?: string;
  isInEditMode: boolean;
  onChange: (operator: RelationalOperator) => void;
  operator: RelationalOperator;
};

const operatorList: RelationalOperator[] = [
  ...Object.values(GenericRelationOperator),
  ...Object.values(NumberRelationOperator),
];

export const RelationalOperatorSelector = ({
  className,
  isInEditMode,
  onChange,
  operator,
}: RelationalOperatorSelectorProps) => {
  const { texts } = useContext(StudioExpressionContext);
  const { relationalOperators } = texts;

  if (!isInEditMode) return <Paragraph size='small'>{relationalOperators[operator]}</Paragraph>;

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) =>
    onChange(event.target.value as RelationalOperator);

  return (
    <div className={className}>
      <NativeSelect
        size='small'
        label={texts.relationalOperator}
        value={operator}
        onChange={handleChange}
      >
        {operatorList.map((o) => (
          <option key={o} value={o}>
            {relationalOperators[o]}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
};
