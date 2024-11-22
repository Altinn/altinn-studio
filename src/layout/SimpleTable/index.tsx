import React, { forwardRef } from 'react';

import { SimpleTableDef } from 'src/layout/SimpleTable/config.def.generated';
import { SimpleTableComponent } from 'src/layout/SimpleTable/SimpleTableComponent';
import { SimpleTableFeatureFlagLayoutValidator } from 'src/layout/SimpleTable/SimpleTableFeatureFlagLayoutValidator';
import { SimpleTableSummary } from 'src/layout/SimpleTable/SimpleTableSummary';
import type { LayoutValidationCtx } from 'src/features/devtools/layoutValidation/types';
import type { PropsFromGenericComponent } from 'src/layout';
import type { NodeValidationProps } from 'src/layout/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export class SimpleTable extends SimpleTableDef {
  validateDataModelBindings(ctx: LayoutValidationCtx<'SimpleTable'>): string[] {
    const [errors, result] = this.validateDataModelBindingsAny(ctx, 'tableData', ['array']);
    if (errors) {
      return errors;
    }

    if (Array.isArray(result.items) && result?.items.length > 0) {
      const innerType = result?.items[0];
      if (typeof innerType !== 'object' || !innerType.type || innerType.type !== 'object') {
        return [
          `group-datamodellbindingen må peke på en liste av objekter. Bruk andre komponenter for å vise lister av strings eller tall.`,
        ];
      }
    }

    return [];
  }

  getDisplayData(): string {
    return '';
  }
  renderSummary2(props: Summary2Props<'SimpleTable'>): React.JSX.Element | null {
    return <SimpleTableSummary componentNode={props.target} />;
  }
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'SimpleTable'>>(
    function LayoutComponentTableRender(props, _): React.JSX.Element | null {
      return <SimpleTableComponent {...props} />;
    },
  );

  renderLayoutValidators(props: NodeValidationProps<'SimpleTable'>): React.JSX.Element | null {
    return <SimpleTableFeatureFlagLayoutValidator {...props} />;
  }

  renderSummary(_: SummaryRendererProps<'SimpleTable'>): React.JSX.Element | null {
    return null;
  }
}
