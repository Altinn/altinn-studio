import type { BaseSyntheticEvent, ChangeEvent } from 'react';
import React from 'react';
import { makeDomFriendlyID } from '../../../../utils/ui-schema-utils';
import { StudioTextfield } from '@studio/components-legacy';

export interface IRestrictionFieldProps {
  className?: string;
  keyName: string;
  label: string;
  onChangeValue: (id: string, key: string, value: string) => void;
  onReturn?: (e: BaseSyntheticEvent) => void;
  path: string;
  readOnly?: boolean;
  value?: string;
}

export const RestrictionField = ({
  className,
  keyName,
  label,
  onChangeValue,
  path,
  readOnly,
  value,
}: IRestrictionFieldProps) => {
  const fieldId = makeDomFriendlyID(path, { suffix: `${keyName}-value` });
  const handleChange = ({ target }: ChangeEvent<HTMLInputElement>) => {
    const element = target as HTMLInputElement;
    if (element.value !== value) {
      onChangeValue(path, keyName, element.value);
    }
  };
  return (
    <div className={className}>
      <StudioTextfield
        aria-label={label}
        id={fieldId}
        label={label}
        onChange={handleChange}
        readOnly={readOnly}
        value={value ?? ''}
      />
    </div>
  );
};
