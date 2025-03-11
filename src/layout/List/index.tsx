import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import type { JSONSchema7Definition } from 'json-schema';

import { useDisplayData } from 'src/features/displayData/useDisplayData';
import { evalQueryParameters } from 'src/features/options/evalQueryParameters';
import { ListDef } from 'src/layout/List/config.def.generated';
import { ListComponent } from 'src/layout/List/ListComponent';
import { ListSummary } from 'src/layout/List/ListSummary';
import { useValidateListIsEmpty } from 'src/layout/List/useValidateListIsEmpty';
import { SummaryItemSimple } from 'src/layout/Summary/SummaryItemSimple';
import type { LayoutValidationCtx } from 'src/features/devtools/layoutValidation/types';
import type { DisplayDataProps } from 'src/features/displayData';
import type { ComponentValidation } from 'src/features/validation';
import type { PropsFromGenericComponent } from 'src/layout';
import type { ExprResolver, SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class List extends ListDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'List'>>(
    function LayoutComponentListRender(props, _): JSX.Element | null {
      return <ListComponent {...props} />;
    },
  );

  getDisplayData({ formData, nodeId, nodeDataSelector }: DisplayDataProps<'List'>): string {
    const dmBindings = nodeDataSelector((picker) => picker(nodeId, 'List')?.layout.dataModelBindings, [nodeId]);
    const summaryBinding = nodeDataSelector((picker) => picker(nodeId, 'List')?.item?.summaryBinding, [nodeId]);
    const legacySummaryBinding = nodeDataSelector(
      (picker) => picker(nodeId, 'List')?.item?.bindingToShowInSummary,
      [nodeId],
    );

    if (summaryBinding && dmBindings) {
      return formData?.[summaryBinding] ?? '';
    } else if (legacySummaryBinding && dmBindings) {
      for (const [key, binding] of Object.entries(dmBindings)) {
        if (binding.field === legacySummaryBinding) {
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
    return (
      <ListSummary
        componentNode={props.target}
        isCompact={props.isCompact}
        emptyFieldText={props.override?.emptyFieldText}
      />
    );
  }

  useEmptyFieldValidation(node: LayoutNode<'List'>): ComponentValidation[] {
    return useValidateListIsEmpty(node);
  }

  validateDataModelBindings(ctx: LayoutValidationCtx<'List'>): string[] {
    const errors: string[] = [];
    const allowedTypes = ['string', 'boolean', 'number', 'integer'];

    const dataModelBindings = ctx.item.dataModelBindings ?? {};

    if (!dataModelBindings?.saveToList) {
      for (const [binding] of Object.entries(dataModelBindings ?? {})) {
        const [newErrors] = this.validateDataModelBindingsAny(ctx, binding, allowedTypes, false);
        errors.push(...(newErrors || []));
      }
    }

    const [newErrors] = this.validateDataModelBindingsAny(ctx, 'saveToList', ['array'], false);
    if (newErrors) {
      errors.push(...(newErrors || []));
    }

    if (dataModelBindings?.saveToList) {
      const saveToListBinding = ctx.lookupBinding(dataModelBindings?.saveToList);
      const items = saveToListBinding[0]?.items;
      const properties =
        items && !Array.isArray(items) && typeof items === 'object' && 'properties' in items
          ? items.properties
          : undefined;

      for (const [binding] of Object.entries(dataModelBindings ?? {})) {
        let selectedBinding: JSONSchema7Definition | undefined;
        if (properties) {
          selectedBinding = properties[binding];
        }
        if (binding !== 'saveToList' && items && typeof items === 'object' && 'properties' in items) {
          if (!selectedBinding) {
            errors.push(`saveToList must contain a field with the same name as the field ${binding}`);
          } else if (typeof selectedBinding !== 'object' || typeof selectedBinding.type !== 'string') {
            errors.push(`Field ${binding} in saveToList must be one of types ${allowedTypes.join(', ')}`);
          } else if (!allowedTypes.includes(selectedBinding.type)) {
            errors.push(`Field ${binding} in saveToList must be one of types ${allowedTypes.join(', ')}`);
          }
        }
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
