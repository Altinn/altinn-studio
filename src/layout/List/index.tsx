import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { FrontendValidationSource, ValidationMask } from 'src/features/validation';
import { ListDef } from 'src/layout/List/config.def.generated';
import { ListComponent } from 'src/layout/List/ListComponent';
import { ListSummary } from 'src/layout/List/ListSummary';
import { SummaryItemSimple } from 'src/layout/Summary/SummaryItemSimple';
import { getFieldNameKey } from 'src/utils/formComponentUtils';
import type { LayoutValidationCtx } from 'src/features/devtools/layoutValidation/types';
import type { DisplayDataProps } from 'src/features/displayData';
import type { ComponentValidation, ValidationDataSources } from 'src/features/validation';
import type { PropsFromGenericComponent } from 'src/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class List extends ListDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'List'>>(
    function LayoutComponentListRender(props, _): JSX.Element | null {
      return <ListComponent {...props} />;
    },
  );

  getDisplayData(node: LayoutNode<'List'>, { nodeFormDataSelector, nodeDataSelector }: DisplayDataProps): string {
    const formData = nodeFormDataSelector(node);
    const dmBindings = nodeDataSelector((picker) => picker(node)?.layout.dataModelBindings, [node]);
    const dmBindingForSummary = nodeDataSelector((picker) => picker(node)?.item?.bindingToShowInSummary, [node]);
    for (const [key, binding] of Object.entries(dmBindings || {})) {
      if (binding == dmBindingForSummary) {
        return formData[key] || '';
      }
    }

    return '';
  }

  renderSummary({ targetNode }: SummaryRendererProps<'List'>): JSX.Element | null {
    const displayData = this.useDisplayData(targetNode);
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

  runEmptyFieldValidation(
    node: LayoutNode<'List'>,
    { formDataSelector, invalidDataSelector, nodeDataSelector }: ValidationDataSources,
  ): ComponentValidation[] {
    const required = nodeDataSelector(
      (picker) => {
        const item = picker(node)?.item;
        return item && 'required' in item ? item.required : false;
      },
      [node],
    );
    const dataModelBindings = nodeDataSelector((picker) => picker(node)?.layout.dataModelBindings, [node]);
    if (!required || !dataModelBindings) {
      return [];
    }

    const fields = Object.values(dataModelBindings);
    const validations: ComponentValidation[] = [];
    const textResourceBindings = nodeDataSelector((picker) => picker(node)?.item?.textResourceBindings, [node]);

    let listHasErrors = false;
    for (const field of fields) {
      const data = formDataSelector(field) ?? invalidDataSelector(field);
      const dataAsString =
        typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean' ? String(data) : undefined;

      if (!dataAsString?.length) {
        listHasErrors = true;
      }
    }
    if (listHasErrors) {
      const key = textResourceBindings?.requiredValidation
        ? textResourceBindings?.requiredValidation
        : 'form_filler.error_required';

      const fieldNameReference = {
        key: getFieldNameKey(textResourceBindings, undefined),
        makeLowerCase: true,
      };

      validations.push({
        message: {
          key,
          params: [fieldNameReference],
        },
        severity: 'error',
        source: FrontendValidationSource.EmptyField,
        category: ValidationMask.Required,
      });
    }
    return validations;
  }

  validateDataModelBindings(ctx: LayoutValidationCtx<'List'>): string[] {
    const possibleBindings = Object.keys(ctx.item.tableHeaders || {});

    const errors: string[] = [];
    for (const binding of possibleBindings) {
      if (possibleBindings.includes(binding)) {
        const [newErrors] = this.validateDataModelBindingsAny(
          ctx,
          binding,
          ['string', 'number', 'integer', 'boolean'],
          false,
        );
        errors.push(...(newErrors || []));
      } else {
        errors.push(
          `Bindingen ${binding} er ikke gyldig for denne komponenten. Gyldige bindinger er definert i 'tableHeaders'`,
        );
      }
    }

    return errors;
  }
}
