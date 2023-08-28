import React from 'react';

import { FormComponent } from 'src/layout/LayoutComponent';
import { ListComponent } from 'src/layout/List/ListComponent';
import { SummaryItemSimple } from 'src/layout/Summary/SummaryItemSimple';
import { getFieldName } from 'src/utils/formComponentUtils';
import { buildValidationObject } from 'src/utils/validation/validationHelpers';
import type { ExprResolved } from 'src/features/expressions/types';
import type { PropsFromGenericComponent } from 'src/layout';
import type { ITextResourceBindings } from 'src/layout/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { IDataModelBindingsForList, ILayoutCompList } from 'src/layout/List/types';
import type { LayoutNodeFromType } from 'src/utils/layout/hierarchy.types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { IValidationContext, IValidationObject } from 'src/utils/validation/types';

export class List extends FormComponent<'List'> {
  render(props: PropsFromGenericComponent<'List'>): JSX.Element | null {
    return <ListComponent {...props} />;
  }

  getDisplayData(node: LayoutNodeFromType<'List'>): string {
    const formData = node.getFormData();
    const dmBindings = node.item.dataModelBindings;
    for (const [key, binding] of Object.entries(dmBindings || {})) {
      if (binding == node.item.bindingToShowInSummary) {
        return formData[key] || '';
      }
    }

    return '';
  }

  renderSummary({ targetNode }: SummaryRendererProps<'List'>): JSX.Element | null {
    const displayData = this.useDisplayData(targetNode);
    return <SummaryItemSimple formDataAsString={displayData} />;
  }

  canRenderInTable(): boolean {
    return false;
  }

  runEmptyFieldValidation(
    node: LayoutNodeFromType<'List'>,
    { formData, langTools }: IValidationContext,
  ): IValidationObject[] {
    if (node.isHidden() || !node.item.required) {
      return [];
    }

    const { langAsString } = langTools;
    const textResourceBindings = node.item.textResourceBindings as ITextResourceBindings;
    const validationObjects: IValidationObject[] = [];

    const bindings = Object.values(node.item.dataModelBindings ?? {});
    let listHasErrors = false;
    for (const field of bindings) {
      const data = formData[field];

      if (!data?.length) {
        listHasErrors = true;
      }
    }
    if (listHasErrors) {
      const fieldName = getFieldName(node.item.textResourceBindings, langTools, undefined);
      const message = textResourceBindings?.requiredValidation
        ? langAsString(textResourceBindings?.requiredValidation, [fieldName])
        : langAsString('form_filler.error_required', [fieldName]);
      validationObjects.push(buildValidationObject(node, 'errors', message));
    }
    return validationObjects;
  }
}

export const Config = {
  def: new List(),
  rendersWithLabel: false as const,
};

export type TypeConfig = {
  layout: ILayoutCompList;
  nodeItem: ExprResolved<ILayoutCompList>;
  nodeObj: LayoutNode;
  validTextResourceBindings: undefined;
  validDataModelBindings: IDataModelBindingsForList;
};
