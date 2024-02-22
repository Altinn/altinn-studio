import { SimpleSubExpressionValueType } from '../../../../../enums/SimpleSubExpressionValueType';
import React from 'react';
import type { Props } from './Props';
import { DatamodelPointerSelector } from './DatamodelPointerSelector';
import { ComponentIdSelector } from './ComponentIdSelector';
import { InstanceContextKeySelector } from './InstanceContextKeySelector';
import { StringInput } from './StringInput';
import { NumberInput } from './NumberInput';
import { BooleanInput } from './BooleanInput';

export const SubExpressionValueContentInput = ({
  onChange,
  value,
}: Props<SimpleSubExpressionValueType>) => {
  switch (value.type) {
    case SimpleSubExpressionValueType.Datamodel:
      return <DatamodelPointerSelector onChange={onChange} value={value} />;
    case SimpleSubExpressionValueType.Component:
      return <ComponentIdSelector onChange={onChange} value={value} />;
    case SimpleSubExpressionValueType.InstanceContext:
      return <InstanceContextKeySelector onChange={onChange} value={value} />;
    case SimpleSubExpressionValueType.String:
      return <StringInput onChange={onChange} value={value} />;
    case SimpleSubExpressionValueType.Number:
      return <NumberInput onChange={onChange} value={value} />;
    case SimpleSubExpressionValueType.Boolean:
      return <BooleanInput onChange={onChange} value={value} />;
    default:
      return null;
  }
};
