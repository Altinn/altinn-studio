import React from 'react';

import type { ComponentProps } from 'nextsrc/features/form/components/index';

export const ButtonGroup = ({ component, renderChildren }: ComponentProps) => {
  const children = component.children ?? [];
  const invalidChild = children.find((child) => !['Button', 'CustomButton'].includes(child.type));
  if (invalidChild) {
    throw new Error(`Only Button or CustomButton allowed in ButtonGroup, got: ${invalidChild.type}`);
  }
  return <>{renderChildren(children)}</>;
};
