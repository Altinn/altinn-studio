import React from 'react';
import type { JSX } from 'react';

import type { PropsFromGenericComponent, ValidateAny, ValidateComponent } from '..';

import { FrontendValidationSource, ValidationMask } from 'src/features/validation';
import { runAllValidations } from 'src/layout/componentValidation';
import { RepeatingGroupDef } from 'src/layout/RepeatingGroup/config.def.generated';
import { GroupHierarchyGenerator } from 'src/layout/RepeatingGroup/hierarchy';
import { RepeatingGroupContainer } from 'src/layout/RepeatingGroup/RepeatingGroupContainer';
import { RepeatingGroupProvider } from 'src/layout/RepeatingGroup/RepeatingGroupContext';
import { RepeatingGroupsFocusProvider } from 'src/layout/RepeatingGroup/RepeatingGroupFocusContext';
import { SummaryRepeatingGroup } from 'src/layout/RepeatingGroup/Summary/SummaryRepeatingGroup';
import type { LayoutValidationCtx } from 'src/features/devtools/layoutValidation/types';
import type {
  ComponentValidation,
  FrontendValidations,
  ISchemaValidationError,
  ValidationDataSources,
} from 'src/features/validation';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { ComponentHierarchyGenerator } from 'src/utils/layout/HierarchyGenerator';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class RepeatingGroup extends RepeatingGroupDef implements ValidateAny, ValidateComponent {
  private _hierarchyGenerator = new GroupHierarchyGenerator();

  directRender(): boolean {
    return true;
  }

  render = (props: PropsFromGenericComponent<'RepeatingGroup'>): JSX.Element | null => (
    <RepeatingGroupProvider node={props.node}>
      <RepeatingGroupsFocusProvider>
        <RepeatingGroupContainer containerDivRef={props.containerDivRef} />
      </RepeatingGroupsFocusProvider>
    </RepeatingGroupProvider>
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

  runValidations(
    node: LayoutNode,
    ctx: ValidationDataSources,
    schemaErrors: ISchemaValidationError[],
  ): FrontendValidations {
    return runAllValidations(node, ctx, schemaErrors);
  }

  runComponentValidation(node: LayoutNode<'RepeatingGroup'>): ComponentValidation[] {
    if (!node.item.dataModelBindings) {
      return [];
    }

    const validations: ComponentValidation[] = [];
    // check if minCount is less than visible rows
    const repeatingGroupComponent = node.item;
    const repeatingGroupMinCount = repeatingGroupComponent.minCount || 0;
    const repeatingGroupVisibleRows = repeatingGroupComponent.rows.filter(
      (row) => row && !row.groupExpressions?.hiddenRow,
    ).length;

    const repeatingGroupMinCountValid = repeatingGroupMinCount <= repeatingGroupVisibleRows;

    // if not valid, return appropriate error message
    if (!repeatingGroupMinCountValid) {
      validations.push({
        message: { key: 'validation_errors.minItems', params: [repeatingGroupMinCount] },
        severity: 'error',
        componentId: node.item.id,
        source: FrontendValidationSource.Component,
        category: ValidationMask.Component,
      });
    }

    return validations;
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
