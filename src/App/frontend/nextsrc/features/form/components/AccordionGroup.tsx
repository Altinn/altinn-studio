import React from 'react';

import type { ComponentProps } from 'nextsrc/features/form/components/index';

export const AccordionGroup = ({ component, renderChildren }: ComponentProps) => {
  const children = component.children ?? [];
  return <div>{renderChildren(children)}</div>;
};
