import React from 'react';

import { useTextResource } from 'nextsrc/libs/form-client/react/hooks';

import type { ComponentProps } from 'nextsrc/features/form/components/index';
import type { CompGroupExternal } from 'src/layout/Group/config.generated';

export const Group = ({ component, renderChildren }: ComponentProps) => {
  const props = component as unknown as CompGroupExternal;
  const titleKey = typeof props.textResourceBindings?.title === 'string' ? props.textResourceBindings.title : undefined;
  const title = useTextResource(titleKey);
  const children = component.children ?? [];

  return (
    <div>
      {title && <h3>{title}</h3>}
      {renderChildren(children)}
    </div>
  );
};
