import React from 'react';

import type { PropsFromGenericComponent } from '..';

import { LinkDef } from 'src/layout/Link/config.def.generated';
import { LinkComponent } from 'src/layout/Link/LinkComponent';

export class Link extends LinkDef {
  render(props: PropsFromGenericComponent<'Link'>): JSX.Element | null {
    return <LinkComponent {...props} />;
  }
}
