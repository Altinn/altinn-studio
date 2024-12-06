import type { SimpleSubexpressionValueType } from '../../../../../enums/SimpleSubexpressionValueType';
import React, { useState } from 'react';
import { useStudioExpressionContext } from '../../../../../StudioExpressionContext';
import { ExpressionErrorKey } from '../../../../../enums/ExpressionErrorKey';
import { DataLookupFuncName } from '../../../../../enums/DataLookupFuncName';
import { Combobox } from '@digdir/designsystemet-react';
import type { Props } from './Props';

export const DataModelPointerSelector = ({
  value,
  onChange,
}: Props<SimpleSubexpressionValueType.DataModel>) => {
  const { dataLookupOptions, texts } = useStudioExpressionContext();
  const [errorKey, setErrorKey] = useState<ExpressionErrorKey | null>(null);
  const [pathValue, setPathValue] = useState<string>(value.path);

  const options = dataLookupOptions[DataLookupFuncName.DataModel];

  const handleChange = (values: string[]) => {
    if (values.length) {
      setPathValue(values[0]);
      onChange({ ...value, path: values[0] });
      setErrorKey(null);
    } else {
      setPathValue('');
      setErrorKey(ExpressionErrorKey.InvalidDataModelPath);
    }
  };

  return (
    <Combobox
      error={texts.errorMessages[errorKey]}
      label={texts.dataModelPath}
      onValueChange={handleChange}
      size='small'
      value={pathValue ? [pathValue] : []}
    >
      {options.map((option) => (
        <Combobox.Option key={option} value={option}>
          {option}
        </Combobox.Option>
      ))}
    </Combobox>
  );
};
