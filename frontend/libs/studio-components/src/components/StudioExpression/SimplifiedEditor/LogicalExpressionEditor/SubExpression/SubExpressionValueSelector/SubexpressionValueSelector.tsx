import type { SimpleSubexpressionValue } from '../../../../types/SimpleSubexpressionValue';
import React from 'react';
import type { SimpleSubexpressionValueType } from '../../../../enums/SimpleSubexpressionValueType';
import { SubexpressionValueContentInput } from './SubExpressionValueContentInput';
import { SubexpressionValueTypeSelector } from './SubExpressionValueTypeSelector';
import { SubexpressionValueReadonly } from './SubExpressionValueReadonly';
import { Fieldset } from '@digdir/designsystemet-react';
import classes from './SubexpressionValueSelector.module.css';
import { getDefaultValueOfType } from './getDefaultValueOfType';

export type SubexpressionValueSelectorProps = {
  className?: string;
  isInEditMode?: boolean;
  legend: string;
  onChange: (value: SimpleSubexpressionValue) => void;
  value: SimpleSubexpressionValue;
};

export const SubexpressionValueSelector = ({
  className,
  isInEditMode,
  legend,
  onChange,
  value,
}: SubexpressionValueSelectorProps) => (
  <div className={`${className} ${classes.wrapper}`}>
    {isInEditMode ? (
      <EditMode value={value} onChange={onChange} legend={legend} />
    ) : (
      <SubexpressionValueReadonly value={value} />
    )}
  </div>
);

type EditModeProps = Omit<SubexpressionValueSelectorProps, 'isInEditMode' | 'className'>;

const EditMode = ({ value, onChange, legend }: EditModeProps) => {
  const handleTypeChange = (type: SimpleSubexpressionValueType) =>
    onChange(getDefaultValueOfType(type));

  return (
    <Fieldset legend={legend} hideLegend>
      <div className={classes.fieldsetContent}>
        <SubexpressionValueTypeSelector onChange={handleTypeChange} value={value.type} />
        <SubexpressionValueContentInput onChange={onChange} value={value} />
      </div>
    </Fieldset>
  );
};
