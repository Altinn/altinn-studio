import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { formatISOString, getDateFormat } from 'src/app-components/Datepicker/utils/dateHelpers';
import { useDisplayData } from 'src/features/displayData/useDisplayData';
import { useLayoutLookups } from 'src/features/form/layout/LayoutsContext';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { FrontendValidationSource } from 'src/features/validation';
import { DatepickerDef } from 'src/layout/Datepicker/config.def.generated';
import { DatepickerComponent } from 'src/layout/Datepicker/DatepickerComponent';
import { DatepickerSummary } from 'src/layout/Datepicker/DatepickerSummary';
import { useDatepickerValidation } from 'src/layout/Datepicker/useDatepickerValidation';
import { SummaryItemSimple } from 'src/layout/Summary/SummaryItemSimple';
import { useValidateDataModelBindingsAny } from 'src/utils/layout/generator/validation/hooks';
import { useNodeFormDataWhenType, useNodeItemWhenType } from 'src/utils/layout/useNodeItem';
import type { LayoutLookups } from 'src/features/form/layout/makeLayoutLookups';
import type { BaseValidation, ComponentValidation } from 'src/features/validation';
import type {
  PropsFromGenericComponent,
  ValidateComponent,
  ValidationFilter,
  ValidationFilterFunction,
} from 'src/layout';
import type { IDataModelBindings } from 'src/layout/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class Datepicker extends DatepickerDef implements ValidateComponent<'Datepicker'>, ValidationFilter {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'Datepicker'>>(
    function LayoutComponentDatepickerRender(props, _): JSX.Element | null {
      return <DatepickerComponent {...props} />;
    },
  );

  useDisplayData(nodeId: string): string {
    const formData = useNodeFormDataWhenType(nodeId, 'Datepicker');
    const currentLanguage = useCurrentLanguage();
    const item = useNodeItemWhenType(nodeId, 'Datepicker');
    const format = item?.format;
    const data = formData?.simpleBinding ?? '';
    if (!data) {
      return '';
    }

    const dateFormat = getDateFormat(format, currentLanguage);
    return formatISOString(data, dateFormat) ?? data;
  }

  renderSummary({ targetNode }: SummaryRendererProps<'Datepicker'>): JSX.Element | null {
    const displayData = useDisplayData(targetNode);
    return (
      <SummaryItemSimple
        formDataAsString={displayData}
        hideFromVisualTesting={true}
      />
    );
  }

  renderSummary2(props: Summary2Props<'Datepicker'>): JSX.Element | null {
    return <DatepickerSummary {...props} />;
  }

  useComponentValidation(node: LayoutNode<'Datepicker'>): ComponentValidation[] {
    return useDatepickerValidation(node);
  }

  /**
   * Datepicker has a custom format validation which give a better error message than what the schema provides.
   * Filter out the schema format vaildation to avoid duplicate error messages.
   */
  private static schemaFormatFilter(validation: BaseValidation): boolean {
    return !(
      validation.source === FrontendValidationSource.Schema && validation.message.key === 'validation_errors.pattern'
    );
  }

  /**
   * Avoid duplicate validation message.
   */
  private static schemaFormatMinimumFilter(validation: BaseValidation): boolean {
    return !(
      validation.source === FrontendValidationSource.Schema &&
      validation.message.key === 'validation_errors.formatMinimum'
    );
  }

  /**
   * Avoid duplicate validation message.
   */
  private static schemaFormatMaximumFilter(validation: BaseValidation): boolean {
    return !(
      validation.source === FrontendValidationSource.Schema &&
      validation.message.key === 'validation_errors.formatMaximum'
    );
  }

  getValidationFilters(node: LayoutNode<'Datepicker'>, layoutLookups: LayoutLookups): ValidationFilterFunction[] {
    const filters = [Datepicker.schemaFormatFilter];
    const component = layoutLookups.getComponent(node.baseId, 'Datepicker');

    if (component.minDate) {
      filters.push(Datepicker.schemaFormatMinimumFilter);
    }

    if (component.maxDate) {
      filters.push(Datepicker.schemaFormatMaximumFilter);
    }

    return filters;
  }

  useDataModelBindingValidation(node: LayoutNode<'Datepicker'>, bindings: IDataModelBindings<'Datepicker'>): string[] {
    const component = useLayoutLookups().getComponent(node.baseId, 'Datepicker');
    const validation = useValidateDataModelBindingsAny(node, bindings, 'simpleBinding', ['string']);
    const [errors, result] = [validation[0] ?? [], validation[1]];

    if (result?.format === 'date-time' && component.timeStamp === false) {
      errors.push(
        `simpleBinding-datamodellbindingen peker på en streng med "format": "date-time", men komponenten har "timeStamp": false. Komponenten lagrer feil format i henhold til datamodellen.`,
      );
    }
    if (result?.format === 'date' && (component.timeStamp === undefined || component.timeStamp)) {
      errors.push(
        `simpleBinding-datamodellbindingen peker på en streng med "format": "date" men komponenten har "timeStamp": true${component.timeStamp ? '' : ' (default)'}. Komponenten lagrer feil format i henhold til datamodellen.`,
      );
    }

    return errors;
  }
}
