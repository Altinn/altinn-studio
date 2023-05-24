import React from 'react';

import type { PropsFromGenericComponent } from '..';

import { ActionComponent } from 'src/layout/LayoutComponent';
import { LinkComponent } from 'src/layout/Link/LinkComponent';

export class Link extends ActionComponent<'Link'> {
  render(props: PropsFromGenericComponent<'Link'>): JSX.Element | null {
    return <LinkComponent {...props} />;
  }

  canRenderInButtonGroup(): boolean {
    return true;
  }

  renderWithLabel(): boolean {
    return false;
  }
}
