import React from 'react';
import type { JSX } from 'react';

import type { ErrorObject } from 'ajv';

import { GridDef } from 'src/layout/Grid/config.def.generated';
import { RenderGrid } from 'src/layout/Grid/GridComponent';
import { GridSummaryComponent } from 'src/layout/Grid/GridSummaryComponent';
import { GridHierarchyGenerator } from 'src/layout/Grid/hierarchy';
import type { PropsFromGenericComponent } from 'src/layout';
import type { CompExternalExact } from 'src/layout/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { ComponentHierarchyGenerator } from 'src/utils/layout/HierarchyGenerator';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class Grid extends GridDef {
  private _hierarchyGenerator = new GridHierarchyGenerator();

  render(props: PropsFromGenericComponent<'Grid'>): JSX.Element | null {
    return <RenderGrid {...props} />;
  }

  renderSummary(props: SummaryRendererProps<'Grid'>): JSX.Element | null {
    return <GridSummaryComponent {...props} />;
  }

  renderSummaryBoilerplate(): boolean {
    return false;
  }

  getDisplayData(_node: LayoutNode<'Grid'>): string {
    return '';
  }

  hierarchyGenerator(): ComponentHierarchyGenerator<'Grid'> {
    return this._hierarchyGenerator;
  }

  validateDataModelBindings(): string[] {
    return [];
  }

  /**
   * Override layout validation to validate grid cells individually
   */
  validateLayoutConfing(
    component: CompExternalExact<'Grid'>,
    validatate: (pointer: string | null, data: unknown) => ErrorObject[] | undefined,
  ): ErrorObject[] | undefined {
    const schemaPointer = '#/definitions/AnyComponent';
    const rawErrors = validatate(schemaPointer, component);

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
            const cellErrors = validatate(cellPointer, cell);
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
