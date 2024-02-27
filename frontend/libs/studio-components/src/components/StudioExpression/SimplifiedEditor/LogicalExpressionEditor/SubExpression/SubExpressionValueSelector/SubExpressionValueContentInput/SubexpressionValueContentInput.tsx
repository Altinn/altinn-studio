import { SimpleSubexpressionValueType } from '../../../../../enums/SimpleSubexpressionValueType';
import React from 'react';
import type { Props } from './Props';
import { DatamodelPointerSelector } from './DatamodelPointerSelector';
import { ComponentIdSelector } from './ComponentIdSelector';
import { InstanceContextKeySelector } from './InstanceContextKeySelector';
import { StringInput } from './StringInput';
import { NumberInput } from './NumberInput';
import { BooleanInput } from './BooleanInput';

export const SubexpressionValueContentInput = ({
  onChange,
  value,
}: Props<SimpleSubexpressionValueType>) => {
  switch (value.type) {
    case SimpleSubexpressionValueType.Datamodel:
      return <DatamodelPointerSelector onChange={onChange} value={value} />;
    case SimpleSubexpressionValueType.Component:
      return <ComponentIdSelector onChange={onChange} value={value} />;
    case SimpleSubexpressionValueType.InstanceContext:
      return <InstanceContextKeySelector onChange={onChange} value={value} />;
    case SimpleSubexpressionValueType.String:
      return <StringInput onChange={onChange} value={value} />;
    case SimpleSubexpressionValueType.Number:
      return <NumberInput onChange={onChange} value={value} />;
    case SimpleSubexpressionValueType.Boolean:
      return <BooleanInput onChange={onChange} value={value} />;
    default:
      return null;
  }
};
