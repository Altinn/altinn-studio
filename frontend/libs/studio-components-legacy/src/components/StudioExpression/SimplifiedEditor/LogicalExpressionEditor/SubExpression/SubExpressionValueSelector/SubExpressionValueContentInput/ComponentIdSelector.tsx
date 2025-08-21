import type { Props } from './Props';
import type { SimpleSubexpressionValueType } from '../../../../../enums/SimpleSubexpressionValueType';
import React, { useState } from 'react';
import { useStudioExpressionContext } from '../../../../../StudioExpressionContext';
import { ExpressionErrorKey } from '../../../../../enums/ExpressionErrorKey';
import { DataLookupFuncName } from '../../../../../enums/DataLookupFuncName';
import { Combobox } from '@digdir/designsystemet-react';

export const ComponentIdSelector = ({
  value,
  onChange,
}: Props<SimpleSubexpressionValueType.Component>): React.ReactElement => {
  const { dataLookupOptions, texts } = useStudioExpressionContext();
  const options = dataLookupOptions[DataLookupFuncName.Component];
  const idValueExist = options.includes(value.id) || value.id === '';
  const [errorKey, setErrorKey] = useState<ExpressionErrorKey | null>(
    idValueExist ? null : ExpressionErrorKey.ComponentIDNoLongerExists,
  );
  const [idValue, setIdValue] = useState<string>(value.id);

  const handleChange = (values: string[]): void => {
    if (values.length) {
      setIdValue(values[0]);
      onChange({ ...value, id: values[0] });
      setErrorKey(null);
    } else {
      setIdValue('');
      setErrorKey(ExpressionErrorKey.InvalidComponentId);
    }
  };

  return (
    <Combobox
      error={errorKey === null ? undefined : texts.errorMessages[errorKey]}
      label={texts.componentId}
      onValueChange={handleChange}
      size='small'
      value={idValue && idValueExist ? [idValue] : []}
    >
      {options.map((option) => (
        <Combobox.Option key={option} value={option}>
          {option}
        </Combobox.Option>
      ))}
    </Combobox>
  );
};
