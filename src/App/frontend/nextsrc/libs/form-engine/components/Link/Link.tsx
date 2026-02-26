import React from 'react';

import { useTextResource } from 'nextsrc/libs/form-client/react/hooks';

import type { ComponentProps } from 'nextsrc/libs/form-engine/components/index';
import type { CompLinkExternal } from 'src/layout/Link/config.generated';

export const Link = ({ component }: ComponentProps) => {
  const props = component as CompLinkExternal;
  const targetKey =
    typeof props.textResourceBindings?.target === 'string' ? props.textResourceBindings.target : undefined;
  const titleKey = typeof props.textResourceBindings?.title === 'string' ? props.textResourceBindings.title : undefined;
  const target = useTextResource(targetKey);
  const title = useTextResource(titleKey);

  return (
    <a
      href={target}
      target={props.openInNewTab ? '_blank' : undefined}
      rel={props.openInNewTab ? 'noopener noreferrer' : undefined}
    >
      {title || target}
    </a>
  );
};
