import type { SimpleSubexpressionValueType } from '../../../../../enums/SimpleSubexpressionValueType';
import React, { useState } from 'react';
import { useStudioExpressionContext } from '../../../../../StudioExpressionContext';
import { ExpressionErrorKey } from '../../../../../enums/ExpressionErrorKey';
import { DataLookupFuncName } from '../../../../../enums/DataLookupFuncName';
import type { Props } from './Props';
import { StudioSuggestion } from '../../../../../../StudioSuggestion';
import type { StudioSuggestionProps } from '../../../../../../StudioSuggestion/StudioSuggestion';

export const DataModelPointerSelector = ({
  value,
  onChange,
}: Props<SimpleSubexpressionValueType.DataModel>): React.ReactElement => {
  const { dataLookupOptions, texts } = useStudioExpressionContext();
  const [errorKey, setErrorKey] = useState<ExpressionErrorKey | null>(null);
  const [pathValue, setPathValue] = useState<string>(value.path);

  const options = dataLookupOptions[DataLookupFuncName.DataModel];

  const handleChange: StudioSuggestionProps['onSelectedChange'] = (values) => {
    if (values.length) {
      const path = values[0].value;
      setPathValue(path);
      onChange({ ...value, path });
      setErrorKey(null);
    } else {
      setPathValue('');
      setErrorKey(ExpressionErrorKey.InvalidDataModelPath);
    }
  };

  return (
    <StudioSuggestion
      emptyText=''
      error={errorKey === null ? undefined : texts.errorMessages[errorKey]}
      label={texts.dataModelPath}
      onSelectedChange={handleChange}
      selected={pathValue ? [pathValue] : []}
    >
      {options.map((option) => (
        <StudioSuggestion.Option key={option} value={option}>
          {option}
        </StudioSuggestion.Option>
      ))}
    </StudioSuggestion>
  );
};
