import type { SimpleSubexpressionValueType } from '../../../../../enums/SimpleSubexpressionValueType';
import React, { ChangeEventHandler, useState } from 'react';
import { useStudioExpressionContext } from '../../../../../StudioExpressionContext';
import { DataLookupFuncName } from '../../../../../enums/DataLookupFuncName';
import type { Props } from './Props';
import { StudioSelect } from '../../../../../../StudioSelect';

export const DataModelPointerSelector = ({
  value,
  onChange,
}: Props<SimpleSubexpressionValueType.DataModel>): React.ReactElement => {
  const { dataLookupOptions, texts } = useStudioExpressionContext();
  const [pathValue, setPathValue] = useState<string>(value.path);

  const options = dataLookupOptions[DataLookupFuncName.DataModel];

  const handleChange: ChangeEventHandler<HTMLSelectElement> = (event) => {
    const path = event.target.value;
    setPathValue(path);
    onChange({ ...value, path });
  };

  return (
    <StudioSelect label={texts.dataModelPath} onChange={handleChange} value={pathValue || ''}>
      <StudioSelect.Option value='' disabled />
      {options.map((option) => (
        <StudioSelect.Option key={option} value={option}>
          {option}
        </StudioSelect.Option>
      ))}
    </StudioSelect>
  );
};
