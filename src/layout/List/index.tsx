import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import dot from 'dot-object';

import { lookupErrorAsText } from 'src/features/datamodel/lookupErrorAsText';
import { useDisplayData } from 'src/features/displayData/useDisplayData';
import { evalQueryParameters } from 'src/features/options/evalQueryParameters';
import { ObjectToGroupLayoutValidator } from 'src/features/saveToGroup/ObjectToGroupLayoutValidator';
import { useValidateGroupIsEmpty } from 'src/features/saveToGroup/useValidateGroupIsEmpty';
import { ListDef } from 'src/layout/List/config.def.generated';
import { ListComponent } from 'src/layout/List/ListComponent';
import { ListSummary } from 'src/layout/List/ListSummary';
import { SummaryItemSimple } from 'src/layout/Summary/SummaryItemSimple';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import { useNodeFormDataWhenType } from 'src/utils/layout/useNodeItem';
import type { LayoutValidationCtx } from 'src/features/devtools/layoutValidation/types';
import type { ComponentValidation } from 'src/features/validation';
import type { PropsFromGenericComponent } from 'src/layout';
import type { IDataModelReference } from 'src/layout/common.generated';
import type { NodeValidationProps } from 'src/layout/layout';
import type { ExprResolver, SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class List extends ListDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'List'>>(
    function LayoutComponentListRender(props, _): JSX.Element | null {
      return <ListComponent {...props} />;
    },
  );

  useDisplayData(nodeId: string): string {
    const dmBindings = NodesInternal.useNodeDataWhenType(nodeId, 'List', (data) => data.layout.dataModelBindings);
    const groupBinding = dmBindings?.group;
    const checkedBinding = dmBindings?.checked;
    const summaryBinding = NodesInternal.useNodeDataWhenType(nodeId, 'List', (data) => data.item?.summaryBinding);
    const legacySummaryBinding = NodesInternal.useNodeDataWhenType(
      nodeId,
      'List',
      (data) => data.item?.bindingToShowInSummary,
    );
    const formData = useNodeFormDataWhenType(nodeId, 'List');

    if (groupBinding) {
      // When the data model binding is a group binding, all the data is now in formData.group, and all the other
      // values are undefined. This is because useNodeFormDataWhenType doesn't know the intricacies of the group
      // binding and how it works in the List component. We need to find the values inside the rows ourselves.
      const rows = (formData?.group as unknown[] | undefined) ?? [];
      const relativeCheckedBinding = checkedBinding?.field.replace(`${groupBinding.field}.`, '');
      if (summaryBinding && dmBindings) {
        const summaryReference = dmBindings[summaryBinding];
        const rowData = rows
          .filter((row) => !relativeCheckedBinding || dot.pick(relativeCheckedBinding, row) === true)
          .map((row) => (summaryReference ? findDataInRow(row, summaryReference, groupBinding) : ''));

        return Object.values(rowData).join(', ');
      }

      if (legacySummaryBinding && dmBindings) {
        window.logError(
          `Node ${nodeId}: BindingToShowInSummary is deprecated and does not work ` +
            `along with a group binding, use summaryBinding instead`,
        );
      }

      return '';
    }

    if (summaryBinding && dmBindings) {
      return formData?.[summaryBinding] ?? '';
    } else if (legacySummaryBinding && dmBindings) {
      for (const [key, binding] of Object.entries(dmBindings)) {
        if (binding?.field === legacySummaryBinding) {
          return formData?.[key] ?? '';
        }
      }
    }

    return '';
  }

  renderSummary(props: SummaryRendererProps<'List'>): JSX.Element | null {
    const displayData = useDisplayData(props.targetNode);
    return <SummaryItemSimple formDataAsString={displayData} />;
  }

  renderSummary2(props: Summary2Props<'List'>): JSX.Element | null {
    return <ListSummary {...props} />;
  }

  useEmptyFieldValidation(node: LayoutNode<'List'>): ComponentValidation[] {
    return useValidateGroupIsEmpty(node);
  }

  renderLayoutValidators(props: NodeValidationProps<'List'>): JSX.Element | null {
    return <ObjectToGroupLayoutValidator {...props} />;
  }

  validateDataModelBindings(ctx: LayoutValidationCtx<'List'>): string[] {
    const errors: string[] = [];
    const allowedLeafTypes = ['string', 'boolean', 'number', 'integer'];
    const dataModelBindings = ctx.item.dataModelBindings ?? {};

    const groupBinding = dataModelBindings?.group;
    if (groupBinding) {
      const [groupErrors] = this.validateDataModelBindingsAny(ctx, 'group', ['array'], false);
      groupErrors && errors.push(...groupErrors);

      for (const key of Object.keys(dataModelBindings)) {
        const binding = dataModelBindings[key];
        if (key === 'group' || !binding) {
          continue;
        }
        if (binding.dataType !== groupBinding.dataType) {
          errors.push(`Field ${key} must have the same data type as the group binding`);
          continue;
        }
        if (!binding.field.startsWith(`${groupBinding.field}.`)) {
          errors.push(
            `Field ${key} must start with the group binding field (must point to a property inside the group)`,
          );
          continue;
        }
        const fieldWithoutGroup = binding.field.replace(`${groupBinding.field}.`, '');
        const fieldWithIndex = `${groupBinding.field}[0].${fieldWithoutGroup}`;
        const [schema, err] = ctx.lookupBinding({ field: fieldWithIndex, dataType: binding.dataType });
        if (err) {
          errors.push(lookupErrorAsText(err));
        } else if (typeof schema?.type !== 'string' || !allowedLeafTypes.includes(schema.type)) {
          errors.push(`Field ${binding} in group must be one of types ${allowedLeafTypes.join(', ')}`);
        }
      }
    } else {
      for (const [binding] of Object.entries(dataModelBindings ?? {})) {
        const [newErrors] = this.validateDataModelBindingsAny(ctx, binding, allowedLeafTypes, false);
        errors.push(...(newErrors || []));
      }
    }

    return errors;
  }

  evalExpressions(props: ExprResolver<'List'>) {
    return {
      ...this.evalDefaultExpressions(props),
      queryParameters: evalQueryParameters(props),
    };
  }
}

function findDataInRow(row: unknown, binding: IDataModelReference, groupBinding: IDataModelReference): unknown {
  // Remove the first part of the binding.field that overlaps with the group binding
  const field = binding.field.replace(`${groupBinding.field}.`, '');
  return dot.pick(field, row);
}
