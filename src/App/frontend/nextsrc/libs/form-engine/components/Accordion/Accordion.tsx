import React, { useState } from 'react';

import { useTextResource } from 'nextsrc/libs/form-client/react/hooks';
import type { ComponentProps } from 'nextsrc/libs/form-engine/components/index';

import type { CompAccordionExternal } from 'src/layout/Accordion/config.generated';

export const Accordion = ({ component, renderChildren }: ComponentProps) => {
  const props = component as unknown as CompAccordionExternal;
  const titleKey = typeof props.textResourceBindings?.title === 'string' ? props.textResourceBindings.title : undefined;
  const title = useTextResource(titleKey);
  const children = component.children ?? [];
  const [open, setOpen] = useState(false);

  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
    >
      <summary>{title}</summary>
      {renderChildren(children)}
    </details>
  );
};
