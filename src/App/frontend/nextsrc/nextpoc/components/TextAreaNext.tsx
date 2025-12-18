import React from 'react';

// or inline if you prefer
import type { CommonProps } from 'nextsrc/nextpoc/types/CommonComponentProps';

import { TextArea } from 'src/app-components/TextArea/TextArea';
import type { CompIntermediateExact } from 'src/layout/layout';

interface TextAreaNextType {
  component: CompIntermediateExact<'TextArea'>;
  commonProps: CommonProps;
}

export const TextAreaNext: React.FC<TextAreaNextType> = ({ component, commonProps }) => (
  <TextArea
    value={commonProps.currentValue ?? ''}
    onChange={(value) => {
      commonProps.onChange(value);
    }}
    id={component.id}
  />
);
