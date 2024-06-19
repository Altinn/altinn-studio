import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import type { PropsFromGenericComponent, ValidateComponent, ValidationFilter, ValidationFilterFunction } from '..';

import { FrontendValidationSource, ValidationMask } from 'src/features/validation';
import { RepeatingGroupDef } from 'src/layout/RepeatingGroup/config.def.generated';
import { GroupHierarchyGenerator } from 'src/layout/RepeatingGroup/hierarchy';
import { RepeatingGroupContainer } from 'src/layout/RepeatingGroup/RepeatingGroupContainer';
import { RepeatingGroupProvider } from 'src/layout/RepeatingGroup/RepeatingGroupContext';
import { RepeatingGroupsFocusProvider } from 'src/layout/RepeatingGroup/RepeatingGroupFocusContext';
import { SummaryRepeatingGroup } from 'src/layout/RepeatingGroup/Summary/SummaryRepeatingGroup';
import type { LayoutValidationCtx } from 'src/features/devtools/layoutValidation/types';
import type { BaseValidation, ComponentValidation } from 'src/features/validation';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { ComponentHierarchyGenerator } from 'src/utils/layout/HierarchyGenerator';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class RepeatingGroup extends RepeatingGroupDef implements ValidateComponent, ValidationFilter {
  private _hierarchyGenerator = new GroupHierarchyGenerator();

  directRender(): boolean {
    return true;
  }

  render = forwardRef<HTMLDivElement, PropsFromGenericComponent<'RepeatingGroup'>>(
    function LayoutComponentRepeatingGroupRender(props, ref): JSX.Element | null {
      return (
        <RepeatingGroupProvider node={props.node}>
          <RepeatingGroupsFocusProvider>
            <RepeatingGroupContainer ref={ref} />
          </RepeatingGroupsFocusProvider>
        </RepeatingGroupProvider>
      );
    },
  );

  renderSummary({
    onChangeClick,
    changeText,
    summaryNode,
    targetNode,
    overrides,
  }: SummaryRendererProps<'RepeatingGroup'>): JSX.Element | null {
    return (
      <SummaryRepeatingGroup
        onChangeClick={onChangeClick}
        changeText={changeText}
        summaryNode={summaryNode}
        targetNode={targetNode}
        overrides={overrides}
      />
    );
  }

  renderSummaryBoilerplate(): boolean {
    return false;
  }

  getDisplayData(): string {
    return '';
  }

  hierarchyGenerator(): ComponentHierarchyGenerator<'RepeatingGroup'> {
    return this._hierarchyGenerator;
  }

  runComponentValidation(node: LayoutNode<'RepeatingGroup'>): ComponentValidation[] {
    if (!node.item.dataModelBindings) {
      return [];
    }

    const validations: ComponentValidation[] = [];
    // check if minCount is less than visible rows
    const repeatingGroupComponent = node.item;
    const repeatingGroupMinCount = repeatingGroupComponent.minCount ?? 0;
    const repeatingGroupVisibleRows = repeatingGroupComponent.rows.filter(
      (row) => row && !row.groupExpressions?.hiddenRow,
    ).length;

    // Validate minCount
    if (repeatingGroupVisibleRows < repeatingGroupMinCount) {
      validations.push({
        message: { key: 'validation_errors.minItems', params: [repeatingGroupMinCount] },
        severity: 'error',
        componentId: node.item.id,
        source: FrontendValidationSource.Component,
        // Treat visibility of minCount the same as required to prevent showing an error immediately
        category: ValidationMask.Required,
      });
    }

    return validations;
  }

  /**
   * Repeating group has its own minCount property, so if set, we should filter out the minItems validation from schema.
   */
  private schemaMinItemsFilter(validation: BaseValidation): boolean {
    return !(
      validation.source === FrontendValidationSource.Schema && validation.message.key === 'validation_errors.minItems'
    );
  }

  getValidationFilters(_node: LayoutNode<'RepeatingGroup'>): ValidationFilterFunction[] {
    if ((_node.item.minCount ?? 0) > 0) {
      return [this.schemaMinItemsFilter];
    }
    return [];
  }

  isDataModelBindingsRequired(): boolean {
    return true;
  }

  validateDataModelBindings(ctx: LayoutValidationCtx<'RepeatingGroup'>): string[] {
    const [errors, result] = this.validateDataModelBindingsAny(ctx, 'group', ['array']);
    if (errors) {
      return errors;
    }

    if (result) {
      const innerType = Array.isArray(result.items) ? result.items[0] : result.items;
      if (!innerType || typeof innerType !== 'object' || !innerType.type || innerType.type !== 'object') {
        return [`group-datamodellbindingen peker mot en ukjent type i datamodellen`];
      }
    }

    return [];
  }
}
