import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import type { PropsFromGenericComponent } from '..';

import { LinkDef } from 'src/layout/Link/config.def.generated';
import { LinkComponent } from 'src/layout/Link/LinkComponent';

export class Link extends LinkDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'Link'>>(
    function LayoutComponentLinkRender(props, _): JSX.Element | null {
      return <LinkComponent {...props} />;
    },
  );
}
