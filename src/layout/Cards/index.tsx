import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { Cards as CardsComponent } from 'src/layout/Cards/Cards';
import { CardsDef } from 'src/layout/Cards/config.def.generated';
import { CardsHierarchyGenerator } from 'src/layout/Cards/hierarchy';
import { SummaryComponent } from 'src/layout/Summary/SummaryComponent';
import type { LayoutValidationCtx } from 'src/features/devtools/layoutValidation/types';
import type { DisplayDataProps } from 'src/features/displayData';
import type { PropsFromGenericComponent } from 'src/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { ComponentHierarchyGenerator } from 'src/utils/layout/HierarchyGenerator';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class Cards extends CardsDef {
  private _hierarchyGenerator = new CardsHierarchyGenerator();

  render = forwardRef<HTMLElement, PropsFromGenericComponent<'Cards'>>(
    function LayoutComponentCardRender(props, _): React.JSX.Element | null {
      return <CardsComponent {...props} />;
    },
  );

  hierarchyGenerator(): ComponentHierarchyGenerator<'Cards'> {
    return this._hierarchyGenerator;
  }

  getDisplayData(_node: LayoutNode<'Cards'>, _displayDataProps: DisplayDataProps): string {
    return '';
  }

  renderSummaryBoilerplate(): boolean {
    return false;
  }

  renderSummary({ summaryNode, targetNode, overrides }: SummaryRendererProps<'Cards'>): JSX.Element | null {
    const children = targetNode.item.cardsInternal.map((card) => card.childNodes).flat();

    return (
      <>
        {children.map((child) => (
          <SummaryComponent
            key={child.item.id}
            summaryNode={summaryNode}
            overrides={{
              ...overrides,
              targetNode: child,
              grid: {},
              largeGroup: true,
            }}
          />
        ))}
      </>
    );
  }

  validateDataModelBindings(_ctx: LayoutValidationCtx<'Cards'>): string[] {
    return [];
  }
}
