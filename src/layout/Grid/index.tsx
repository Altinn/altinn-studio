import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import type { ErrorObject } from 'ajv';

import { claimGridRowsChildren } from 'src/layout/Grid/claimGridRowsChildren';
import { GridDef } from 'src/layout/Grid/config.def.generated';
import { RenderGrid } from 'src/layout/Grid/GridComponent';
import { GridSummary } from 'src/layout/Grid/GridSummary';
import { GridSummaryComponent } from 'src/layout/Grid/GridSummaryComponent';
import { EmptyChildrenBoundary } from 'src/layout/Summary2/isEmpty/EmptyChildrenContext';
import type { PropsFromGenericComponent } from 'src/layout';
import type { CompExternalExact } from 'src/layout/layout';
import type { ChildClaimerProps, SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export class Grid extends GridDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'Grid'>>(
    function LayoutComponentGridRender(props, _): JSX.Element | null {
      return <RenderGrid {...props} />;
    },
  );

  renderSummary(props: SummaryRendererProps): JSX.Element | null {
    return <GridSummaryComponent {...props} />;
  }

  renderSummary2(props: Summary2Props): JSX.Element | null {
    return (
      <EmptyChildrenBoundary>
        <GridSummary {...props} />
      </EmptyChildrenBoundary>
    );
  }

  renderSummaryBoilerplate(): boolean {
    return false;
  }

  claimChildren(props: ChildClaimerProps<'Grid'>): void {
    claimGridRowsChildren(props, props.item.rows);
  }

  /**
   * Override layout validation to validate grid cells individually
   */
  validateLayoutConfig(
    component: CompExternalExact<'Grid'>,
    validate: (pointer: string | null, data: unknown) => ErrorObject[] | undefined,
  ): ErrorObject[] | undefined {
    const schemaPointer = '#/definitions/AnyComponent';
    const rawErrors = validate(schemaPointer, component);

    if (!rawErrors) {
      return undefined;
    }

    // Filter out errors for cells, these will be handled individually
    const errors = rawErrors.filter((e) => !e.instancePath.match(/^\/rows\/\d+\/cells\/\d+(\/.+)?/));

    if (Array.isArray(component.rows)) {
      // Validate cell individually according to their type
      for (const [i, row] of component.rows.entries()) {
        if (Array.isArray(row?.cells)) {
          for (const [j, cell] of row.cells.entries()) {
            // If the cell type is undecidable, validate against empty schema
            let cellPointer: string | null = null;
            if (cell == null) {
              // null is valid, no need to validate
              continue;
            } else if (typeof cell === 'object' && 'text' in cell) {
              cellPointer = '#/definitions/GridCellText';
            } else if (typeof cell === 'object' && 'labelFrom' in cell) {
              cellPointer = '#/definitions/GridCellLabelFrom';
            } else if (typeof cell === 'object' && 'component' in cell) {
              cellPointer = '#/definitions/GridComponentRef';
            }
            const cellErrors = validate(cellPointer, cell);
            if (cellErrors) {
              // Rewrite instancePath to start at the component root
              errors.push(...cellErrors.map((e) => ({ ...e, instancePath: `/rows/${i}/cells/${j}${e.instancePath}` })));
            }
          }
        }
      }
    }

    return errors;
  }
}
