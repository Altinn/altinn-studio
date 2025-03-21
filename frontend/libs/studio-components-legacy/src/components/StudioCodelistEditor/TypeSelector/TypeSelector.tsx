import { CodeListItemType } from '../types/CodeListItemType';
import type { ReactElement } from 'react';
import React, { useCallback } from 'react';
import { useStudioCodeListEditorContext } from '../StudioCodeListEditorContext';
import { StudioNativeSelect } from '../../StudioNativeSelect';
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
    <StudioNativeSelect
      className={classes.typeSelector}
      description={texts.typeSelectorDescription}
      label={texts.typeSelectorLabel}
      onChange={handleChange}
      value={codeType}
    >
      {Object.values(CodeListItemType).map((type) => (
        <option key={type} value={type}>
          {texts.typeSelectorOptions[type]}
        </option>
      ))}
    </StudioNativeSelect>
  );
}
