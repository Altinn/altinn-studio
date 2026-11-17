import { CodeListItemType } from '../types/CodeListItemType';
import type { ReactElement } from 'react';
import React, { useCallback } from 'react';
import { useStudioCodeListEditorContext } from '../StudioCodeListEditorContext';
import { StudioSelect } from '../../StudioSelect';
import classes from './TypeSelector.module.css';

export type TypeSelectorProps = {
  codeType: CodeListItemType;
  onChangeCodeType: (codeType: CodeListItemType) => void;
};

export function TypeSelector({ onChangeCodeType, codeType }: TypeSelectorProps): ReactElement {
  const { texts } = useStudioCodeListEditorContext();

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      onChangeCodeType(event.target.value as CodeListItemType);
    },
    [onChangeCodeType],
  );

  return (
    <StudioSelect
      className={classes.typeSelector}
      description={texts.typeSelectorDescription}
      label={texts.typeSelectorLabel}
      onChange={handleChange}
      value={codeType}
    >
      {Object.values(CodeListItemType).map((type) => (
        <StudioSelect.Option key={type} value={type}>
          {texts.typeSelectorOptions[type]}
        </StudioSelect.Option>
      ))}
    </StudioSelect>
  );
}
