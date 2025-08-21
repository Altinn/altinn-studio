import type { ToggleGroupProps } from '@digdir/designsystemet-react';
import { ToggleGroup } from '@digdir/designsystemet-react';
import React, { forwardRef, useEffect, useState } from 'react';
import type { Override } from '../../types/Override';
import type { WithoutAsChild } from '../../types/WithoutAsChild';

export type StudioBooleanToggleGroupProps = Override<
  {
    onChange?: (value: boolean) => void;
    value?: boolean;
    trueLabel: string;
    falseLabel: string;
  },
  WithoutAsChild<ToggleGroupProps>
>;

const StudioBooleanToggleGroup = forwardRef<HTMLDivElement, StudioBooleanToggleGroupProps>(
  ({ falseLabel, onChange, trueLabel, value: givenValue, ...rest }, ref) => {
    const [value, setValue] = useState<boolean>(givenValue ?? false);

    useEffect(() => {
      setValue(givenValue ?? false);
    }, [givenValue]);

    const handleChange = (stringValue: 'true' | 'false'): void => {
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
