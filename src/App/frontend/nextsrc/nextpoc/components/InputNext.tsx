import React from 'react';

import { Textfield } from '@digdir/designsystemet-react';
// or inline if you prefer
import type { CommonProps } from 'nextsrc/nextpoc/types/CommonComponentProps';

import type { CompIntermediateExact } from 'src/layout/layout';

interface CheckboxesNextType {
  component: CompIntermediateExact<'Input'>;
  commonProps: CommonProps;
}

export const InputNext: React.FC<CheckboxesNextType> = ({ commonProps }) => (
  <Textfield
    aria-labelledby=''
    description=''
    value={commonProps.currentValue}
    onChange={(e) => {
      commonProps.onChange(e.target.value);
    }}
  />
);
