import type { Props } from './Props';
import type { SimpleSubexpressionValueType } from '../../../../../enums/SimpleSubexpressionValueType';
import React, { useState } from 'react';
import { useStudioExpressionContext } from '../../../../../StudioExpressionContext';
import { ExpressionErrorKey } from '../../../../../enums/ExpressionErrorKey';
import { DataLookupFuncName } from '../../../../../enums/DataLookupFuncName';
import { StudioSuggestion } from '../../../../../../StudioSuggestion';
import type { StudioSuggestionProps } from '../../../../../../StudioSuggestion/StudioSuggestion';

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

  const handleChange: StudioSuggestionProps['onSelectedChange'] = (values) => {
    if (values.length) {
      const id = values[0].value;
      setIdValue(id);
      onChange({ ...value, id });
      setErrorKey(null);
    } else {
      setIdValue('');
      setErrorKey(ExpressionErrorKey.InvalidComponentId);
    }
  };

  return (
    <StudioSuggestion
      emptyText=''
      error={errorKey === null ? undefined : texts.errorMessages[errorKey]}
      label={texts.componentId}
      onSelectedChange={handleChange}
      selected={idValue && idValueExist ? [idValue] : []}
    >
      {options.map((option) => (
        <StudioSuggestion.Option key={option} value={option}>
          {option}
        </StudioSuggestion.Option>
      ))}
    </StudioSuggestion>
  );
};
