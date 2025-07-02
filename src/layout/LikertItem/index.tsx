import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { DataModels } from 'src/features/datamodel/DataModelsProvider';
import { useDisplayData } from 'src/features/displayData/useDisplayData';
import { useLayoutLookups } from 'src/features/form/layout/LayoutsContext';
import { useLanguage } from 'src/features/language/useLanguage';
import { getSelectedValueToText } from 'src/features/options/getSelectedValueToText';
import { useOptionsFor } from 'src/features/options/useOptionsFor';
import { useEmptyFieldValidationOnlyOneBinding } from 'src/features/validation/nodeValidation/emptyFieldValidation';
import { LikertItemDef } from 'src/layout/LikertItem/config.def.generated';
import { LikertItemComponent } from 'src/layout/LikertItem/LikertItemComponent';
import { SummaryItemSimple } from 'src/layout/Summary/SummaryItemSimple';
import { validateDataModelBindingsAny } from 'src/utils/layout/generator/validation/hooks';
import { useNodeFormDataWhenType } from 'src/utils/layout/useNodeItem';
import type { ComponentValidation } from 'src/features/validation';
import type { PropsFromGenericComponent } from 'src/layout';
import type { IDataModelBindings } from 'src/layout/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';

export class LikertItem extends LikertItemDef {
  render = forwardRef<HTMLTableRowElement, PropsFromGenericComponent<'LikertItem'>>(
    function LayoutComponentLikertItemRender(props, ref): JSX.Element | null {
      return (
        <LikertItemComponent
          {...props}
          ref={ref}
        />
      );
    },
  );

  useDisplayData(baseComponentId: string): string {
    const formData = useNodeFormDataWhenType(baseComponentId, 'LikertItem');
    const options = useOptionsFor(baseComponentId, 'single').options;
    const langTools = useLanguage();
    const value = String(formData?.simpleBinding ?? '');
    if (!value) {
      return '';
    }

    return getSelectedValueToText(value, langTools, options) || '';
  }

  renderSummary({ targetNode }: SummaryRendererProps<'LikertItem'>): JSX.Element | null {
    const displayData = useDisplayData(targetNode);
    return <SummaryItemSimple formDataAsString={displayData} />;
  }

  useEmptyFieldValidation(baseComponentId: string): ComponentValidation[] {
    return useEmptyFieldValidationOnlyOneBinding(baseComponentId, 'simpleBinding');
  }

  useDataModelBindingValidation(baseComponentId: string, bindings: IDataModelBindings<'LikertItem'>): string[] {
    const lookupBinding = DataModels.useLookupBinding();
    const layoutLookups = useLayoutLookups();
    const [answerErr] = validateDataModelBindingsAny(
      baseComponentId,
      bindings,
      lookupBinding,
      layoutLookups,
      'simpleBinding',
      ['string', 'number', 'boolean'],
    );
    const errors: string[] = [...(answerErr ?? [])];

    const parentRef = layoutLookups.componentToParent[baseComponentId];
    const parent = parentRef && parentRef.type === 'node' ? layoutLookups.allComponents[parentRef.id] : undefined;
    if (parent?.type !== 'Likert') {
      throw new Error('LikertItem must have a parent of type "Likert"');
    }

    const parentBindings = parent.dataModelBindings;
    if (parentBindings.questions.dataType && bindings.simpleBinding.dataType !== parentBindings.questions.dataType) {
      errors.push('answer-datamodellbindingen må peke på samme datatype som questions-datamodellbindingen');
    }

    if (parentBindings.questions && !bindings.simpleBinding.field.startsWith(`${parentBindings.questions.field}[`)) {
      errors.push(`answer-datamodellbindingen må peke på en egenskap inne i questions-datamodellbindingen`);
    }

    return errors;
  }
}
