import React from 'react';

import { PresentationComponent } from 'src/layout/LayoutComponent';
import { ParagraphComponent } from 'src/layout/Paragraph/ParagraphComponent';
import type { PropsFromGenericComponent } from 'src/layout';

export class Paragraph extends PresentationComponent<'Paragraph'> {
  render(props: PropsFromGenericComponent<'Paragraph'>): JSX.Element | null {
    return <ParagraphComponent {...props} />;
  }

  renderWithLabel(): boolean {
    return false;
  }
}
