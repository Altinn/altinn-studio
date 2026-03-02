import React from 'react';

import { Fieldset } from 'src/app-components/Label/Fieldset';
import { useTextResource } from 'nextsrc/libs/form-client/react/hooks';
import { useLabelProps } from 'nextsrc/libs/form-engine/components/useLabelProps';
import type { ComponentProps } from 'nextsrc/libs/form-engine/components/index';
import type { CompGroupExternal } from 'src/layout/Group/config.generated';

export const Group = ({ component, renderChildren }: ComponentProps) => {
  const props = component as unknown as CompGroupExternal;
  const titleKey = typeof props.textResourceBindings?.title === 'string' ? props.textResourceBindings.title : undefined;
  const title = useTextResource(titleKey);
  const { help, description } = useLabelProps(props.textResourceBindings);
  const children = component.children ?? [];

  return (
    <Fieldset
      legend={title}
      help={help}
      description={description}
    >
      {renderChildren(children)}
    </Fieldset>
  );
};
