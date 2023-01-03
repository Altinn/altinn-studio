import React from 'react';

import { LayoutComponent } from 'src/layout/LayoutComponent';
import { ParagraphComponent } from 'src/layout/Paragraph/ParagraphComponent';
import type { PropsFromGenericComponent } from 'src/layout';

export class Paragraph extends LayoutComponent<'Paragraph'> {
  render(props: PropsFromGenericComponent<'Paragraph'>): JSX.Element | null {
    return <ParagraphComponent {...props} />;
  }

  renderWithLabel(): boolean {
    return false;
  }
}
