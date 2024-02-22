import type { SimpleSubExpressionValue } from '../../../../types/SimpleSubExpressionValue';
import React from 'react';
import type { SimpleSubExpressionValueType } from '../../../../enums/SimpleSubExpressionValueType';
import { SubExpressionValueContentInput } from './SubExpressionValueContentInput';
import { SubExpressionValueTypeSelector } from './SubExpressionValueTypeSelector';
import { SubExpressionValueReadonly } from './SubExpressionValueReadonly';
import { Fieldset } from '@digdir/design-system-react';
import classes from './SubExpressionValueSelector.module.css';
import { getDefaultValueOfType } from './getDefaultValueOfType';

export type SubExpressionValueSelectorProps = {
  className?: string;
  isInEditMode?: boolean;
  legend: string;
  onChange: (value: SimpleSubExpressionValue) => void;
  value: SimpleSubExpressionValue;
};

export const SubExpressionValueSelector = ({
  className,
  isInEditMode,
  legend,
  onChange,
  value,
}: SubExpressionValueSelectorProps) => (
  <div className={className}>
    {isInEditMode ? (
      <EditMode value={value} onChange={onChange} legend={legend} />
    ) : (
      <SubExpressionValueReadonly value={value} />
    )}
  </div>
);

type EditModeProps = Omit<SubExpressionValueSelectorProps, 'isInEditMode' | 'className'>;

const EditMode = ({ value, onChange, legend }: EditModeProps) => {
  const handleTypeChange = (type: SimpleSubExpressionValueType) =>
    onChange(getDefaultValueOfType(type));

  return (
    <Fieldset legend={legend} hideLegend>
      <div className={classes.fieldsetContent}>
        <SubExpressionValueTypeSelector onChange={handleTypeChange} value={value.type} />
        <SubExpressionValueContentInput onChange={onChange} value={value} />
      </div>
    </Fieldset>
  );
};
