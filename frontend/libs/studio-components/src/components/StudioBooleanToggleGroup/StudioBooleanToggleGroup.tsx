import type { ToggleGroupProps } from '@digdir/design-system-react';
import { ToggleGroup } from '@digdir/design-system-react';
import React, { forwardRef, useEffect, useState } from 'react';

export type StudioBooleanToggleGroupProps = {
  onChange?: (value: boolean) => void;
  value?: boolean;
  trueLabel: string;
  falseLabel: string;
} & Omit<ToggleGroupProps, 'onChange' | 'value'>;

const StudioBooleanToggleGroup = forwardRef<HTMLDivElement, StudioBooleanToggleGroupProps>(
  ({ falseLabel, onChange, trueLabel, value: givenValue, ...rest }, ref) => {
    const [value, setValue] = useState<boolean>(givenValue ?? false);

    useEffect(() => {
      setValue(givenValue ?? false);
    }, [givenValue]);

    const handleChange = (stringValue: 'true' | 'false') => {
      const newValue = stringValue === 'true';
      setValue(newValue);
      onChange?.(newValue);
    };

    return (
      <ToggleGroup {...rest} onChange={handleChange} value={value ? 'true' : 'false'} ref={ref}>
        <ToggleGroup.Item value='true'>{trueLabel}</ToggleGroup.Item>
        <ToggleGroup.Item value='false'>{falseLabel}</ToggleGroup.Item>
      </ToggleGroup>
    );
  },
);

StudioBooleanToggleGroup.displayName = 'StudioBooleanToggleGroup';

export { StudioBooleanToggleGroup };
