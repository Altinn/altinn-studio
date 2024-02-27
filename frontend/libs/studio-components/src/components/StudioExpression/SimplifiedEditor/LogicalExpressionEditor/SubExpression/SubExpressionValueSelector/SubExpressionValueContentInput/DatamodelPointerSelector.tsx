import type { SimpleSubexpressionValueType } from '../../../../../enums/SimpleSubexpressionValueType';
import React, { useContext, useState } from 'react';
import { StudioExpressionContext } from '../../../../../StudioExpressionContext';
import { ExpressionErrorKey } from '../../../../../enums/ExpressionErrorKey';
import { DataLookupFuncName } from '../../../../../enums/DataLookupFuncName';
import { Combobox } from '@digdir/design-system-react';
import type { Props } from './Props';

export const DatamodelPointerSelector = ({
  value,
  onChange,
}: Props<SimpleSubexpressionValueType.Datamodel>) => {
  const { dataLookupOptions, texts } = useContext(StudioExpressionContext);
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
      setErrorKey(ExpressionErrorKey.InvalidDatamodelPath);
    }
  };

  return (
    <Combobox
      error={texts.errorMessages[errorKey]}
      label={texts.datamodelPath}
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
