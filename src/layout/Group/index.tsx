import React from 'react';
import type { JSX } from 'react';

import { GroupDef } from 'src/layout/Group/config.def.generated';
import { GroupRenderer } from 'src/layout/Group/GroupRenderer';
import { GroupHierarchyGenerator } from 'src/layout/Group/hierarchy';
import { LayoutNodeForGroup } from 'src/layout/Group/LayoutNodeForGroup';
import { SummaryGroupComponent } from 'src/layout/Group/SummaryGroupComponent';
import { runValidationOnNodes } from 'src/utils/validation/validation';
import { buildValidationObject } from 'src/utils/validation/validationHelpers';
import type { IFormData } from 'src/features/formData';
import type { ComponentValidation, GroupValidation, PropsFromGenericComponent } from 'src/layout';
import type { CompInternal, HierarchyDataSources } from 'src/layout/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { ComponentHierarchyGenerator } from 'src/utils/layout/HierarchyGenerator';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { LayoutPage } from 'src/utils/layout/LayoutPage';
import type { IValidationContext, IValidationObject } from 'src/utils/validation/types';

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
    validationContext: IValidationContext,
    onlyInRowIndex?: number,
  ): IValidationObject[] {
    return runValidationOnNodes(node.flat(true, onlyInRowIndex), validationContext);
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
}
