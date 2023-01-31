import React from 'react';

import { ComponentType } from 'src/layout';
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

  getComponentType(): ComponentType {
    return ComponentType.Presentation;
  }
}
