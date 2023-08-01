import React from 'react';

import { PresentationComponent } from 'src/layout/LayoutComponent';
import { ParagraphComponent } from 'src/layout/Paragraph/ParagraphComponent';
import type { ExprResolved } from 'src/features/expressions/types';
import type { PropsFromGenericComponent } from 'src/layout';
import type { ILayoutCompParagraph } from 'src/layout/Paragraph/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class Paragraph extends PresentationComponent<'Paragraph'> {
  render(props: PropsFromGenericComponent<'Paragraph'>): JSX.Element | null {
    return <ParagraphComponent {...props} />;
  }

  canRenderInAccordion(): boolean {
    return true;
  }
}

export const Config = {
  def: new Paragraph(),
  rendersWithLabel: false as const,
};

export type TypeConfig = {
  layout: ILayoutCompParagraph;
  nodeItem: ExprResolved<ILayoutCompParagraph>;
  nodeObj: LayoutNode;
  validTextResourceBindings: 'title' | 'help';
  validDataModelBindings: undefined;
};
