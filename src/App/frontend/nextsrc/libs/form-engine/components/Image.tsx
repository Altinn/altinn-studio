import React from 'react';

import { useTextResource } from 'nextsrc/libs/form-client/react/hooks';

import type { ComponentProps } from 'nextsrc/libs/form-engine/components/index';
import type { CompImageExternal } from 'src/layout/Image/config.generated';

export const Image = ({ component }: ComponentProps) => {
  const props = component as CompImageExternal;
  const altKey =
    typeof props.textResourceBindings?.altTextImg === 'string' ? props.textResourceBindings.altTextImg : undefined;
  const alt = useTextResource(altKey);
  const src = props.image?.src?.nb ?? props.image?.src?.en ?? '';

  if (!src) {
    return null;
  }

  return (
    <img
      src={src}
      alt={alt}
      style={{ width: props.image?.width, justifySelf: props.image?.align }}
    />
  );
};
