import React, { useState } from 'react';

import { Radio } from '@digdir/designsystemet-react';
import { useResolvedOptions } from 'nextsrc/nextpoc/components/CheckboxesNext/useResolvedOptions';
import type { CommonProps } from 'nextsrc/nextpoc/types/CommonComponentProps';

import type { IRawOption } from 'src/layout/common.generated';
import type { CompIntermediateExact } from 'src/layout/layout';

interface RadioButtonsNextType {
  component: CompIntermediateExact<'RadioButtons'>;
  commonProps: CommonProps;
}

export const RadioButtonsNext: React.FC<RadioButtonsNextType> = ({ component, commonProps }) => {
  // 1. Resolve the final options the same way
  const fetchedOptions: IRawOption[] | undefined = useResolvedOptions(component, commonProps);

  // 2. Manage a single, selected value
  const [selected, setSelected] = useState<string>(commonProps.currentValue || '');

  return (
    <div>
      {fetchedOptions?.map((option, idx) => (
        <Radio
          label={option.label}
          key={idx}
          value={`${option.value}`}
          description={option.description}
          checked={selected === option.value}
          onChange={(e) => {
            setSelected(e.target.value);
            commonProps.onChange(e.target.value);
          }}
        >
          {option.label}
        </Radio>
      ))}
    </div>
  );
};
