import React from 'react';

import type { ComponentProps } from 'nextsrc/libs/form-engine/components/index';

export const AccordionGroup = ({ component, renderChildren }: ComponentProps) => {
  const children = component.children ?? [];
  return <div>{renderChildren(children)}</div>;
};
