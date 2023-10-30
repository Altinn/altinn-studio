import React from 'react';
import type { JSX } from 'react';

import type { ErrorObject } from 'ajv';

import { GroupDef } from 'src/layout/Group/config.def.generated';
import { GroupRenderer } from 'src/layout/Group/GroupRenderer';
import { GroupHierarchyGenerator } from 'src/layout/Group/hierarchy';
import { LayoutNodeForGroup } from 'src/layout/Group/LayoutNodeForGroup';
import { SummaryGroupComponent } from 'src/layout/Group/SummaryGroupComponent';
import {
  groupIsNonRepeatingExt,
  groupIsNonRepeatingPanelExt,
  groupIsRepeatingExt,
  groupIsRepeatingLikertExt,
} from 'src/layout/Group/tools';
import { runValidationOnNodes } from 'src/utils/validation/validation';
import { buildValidationObject } from 'src/utils/validation/validationHelpers';
import type { LayoutValidationCtx } from 'src/features/devtools/layoutValidation/types';
import type { IFormData } from 'src/features/formData';
import type { ComponentValidation, GroupValidation, PropsFromGenericComponent } from 'src/layout';
import type { CompExternalExact, CompInternal, HierarchyDataSources } from 'src/layout/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { ComponentHierarchyGenerator } from 'src/utils/layout/HierarchyGenerator';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { LayoutPage } from 'src/utils/layout/LayoutPage';
import type { IValidationContext, IValidationObject, ValidationContextGenerator } from 'src/utils/validation/types';

export class Group extends GroupDef implements GroupValidation, ComponentValidation {
  private _hierarchyGenerator = new GroupHierarchyGenerator();

  directRender(): boolean {
    return true;
  }

  render(props: PropsFromGenericComponent<'Group'>): JSX.Element | null {
    return <GroupRenderer {...props} />;
  }

  renderSummary({
    onChangeClick,
    changeText,
    summaryNode,
    targetNode,
    overrides,
  }: SummaryRendererProps<'Group'>): JSX.Element | null {
    return (
      <SummaryGroupComponent
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

  hierarchyGenerator(): ComponentHierarchyGenerator<'Group'> {
    return this._hierarchyGenerator;
  }

  runComponentValidation(
    node: LayoutNode<'Group'>,
    { langTools }: IValidationContext,
    _overrideFormData?: IFormData,
  ): IValidationObject[] {
    if (!node.isRepGroup()) {
      return [];
    }

    const validationObjects: IValidationObject[] = [];
    // check if minCount is less than visible rows
    const repeatingGroupComponent = node.item;
    const repeatingGroupMinCount = repeatingGroupComponent.minCount || 0;
    const repeatingGroupVisibleRows = repeatingGroupComponent.rows.filter(
      (row) => row && !row.groupExpressions?.hiddenRow,
    ).length;

    const repeatingGroupMinCountValid = repeatingGroupMinCount <= repeatingGroupVisibleRows;

    // if not valid, return appropriate error message
    if (!repeatingGroupMinCountValid) {
      const errorMessage = langTools.langAsString('validation_errors.minItems', [repeatingGroupMinCount]);

      validationObjects.push(buildValidationObject(node, 'errors', errorMessage, 'group'));
    }

    return validationObjects;
  }

  runGroupValidations(
    node: LayoutNode<'Group'>,
    validationCtxGenerator: ValidationContextGenerator,
    onlyInRowIndex?: number,
  ): IValidationObject[] {
    return runValidationOnNodes(node.flat(true, onlyInRowIndex), validationCtxGenerator);
  }

  makeNode(
    item: CompInternal<'Group'>,
    parent: LayoutNode | LayoutPage,
    top: LayoutPage,
    dataSources: HierarchyDataSources,
    rowIndex?: number,
  ): LayoutNodeForGroup {
    return new LayoutNodeForGroup(item, parent, top, dataSources, rowIndex);
  }

  isDataModelBindingsRequired(node: LayoutNode<'Group'>): boolean {
    return node.isRepGroup() || node.isRepGroupLikert();
  }

  validateDataModelBindings(ctx: LayoutValidationCtx<'Group'>): string[] {
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

  /**
   * Override layout validation to select a specific pointer depending on the type of group.
   */
  validateLayoutConfing(
    component: CompExternalExact<'Group'>,
    validatate: (pointer: string, data: unknown) => ErrorObject[] | undefined,
  ): ErrorObject[] | undefined {
    let schemaPointer = '#/definitions/AnyComponent';
    if (groupIsNonRepeatingExt(component)) {
      schemaPointer = '#/definitions/CompGroupNonRepeating';
    } else if (groupIsNonRepeatingPanelExt(component)) {
      schemaPointer = '#/definitions/CompGroupNonRepeatingPanel';
    } else if (groupIsRepeatingLikertExt(component)) {
      schemaPointer = '#/definitions/CompGroupRepeatingLikert';
    } else if (groupIsRepeatingExt(component)) {
      schemaPointer = '#/definitions/CompGroupRepeating';
    }
    return validatate(schemaPointer, component);
  }
}
