import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { isAfter, isBefore } from 'date-fns';

import {
  formatISOString,
  getDateConstraint,
  getDateFormat,
  strictParseISO,
} from 'src/app-components/Datepicker/utils/dateHelpers';
import { FrontendValidationSource, ValidationMask } from 'src/features/validation';
import { DatepickerDef } from 'src/layout/Datepicker/config.def.generated';
import { DatepickerComponent } from 'src/layout/Datepicker/DatepickerComponent';
import { DatepickerSummary } from 'src/layout/Datepicker/DatepickerSummary';
import { SummaryItemSimple } from 'src/layout/Summary/SummaryItemSimple';
import { getDatepickerFormat } from 'src/utils/formatDateLocale';
import type { LayoutValidationCtx } from 'src/features/devtools/layoutValidation/types';
import type { DisplayDataProps } from 'src/features/displayData';
import type { BaseValidation, ComponentValidation, ValidationDataSources } from 'src/features/validation';
import type {
  PropsFromGenericComponent,
  ValidateComponent,
  ValidationFilter,
  ValidationFilterFunction,
} from 'src/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { NodeDataSelector } from 'src/utils/layout/NodesContext';

export class Datepicker extends DatepickerDef implements ValidateComponent<'Datepicker'>, ValidationFilter {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'Datepicker'>>(
    function LayoutComponentDatepickerRender(props, _): JSX.Element | null {
      return <DatepickerComponent {...props} />;
    },
  );

  getDisplayData(
    node: LayoutNode<'Datepicker'>,
    { currentLanguage, nodeFormDataSelector, nodeDataSelector }: DisplayDataProps,
  ): string {
    const data = nodeFormDataSelector(node).simpleBinding ?? '';
    if (!data) {
      return '';
    }

    const format = nodeDataSelector((picker) => picker(node)?.item?.format, [node]);
    const dateFormat = getDateFormat(format, currentLanguage);
    return formatISOString(data, dateFormat) ?? data;
  }

  renderSummary({ targetNode }: SummaryRendererProps<'Datepicker'>): JSX.Element | null {
    const displayData = this.useDisplayData(targetNode);
    return (
      <SummaryItemSimple
        formDataAsString={displayData}
        hideFromVisualTesting={true}
      />
    );
  }

  renderSummary2(props: Summary2Props<'Datepicker'>): JSX.Element | null {
    return (
      <DatepickerSummary
        componentNode={props.target}
        isCompact={props.isCompact}
        emptyFieldText={props.override?.emptyFieldText}
      />
    );
  }

  runComponentValidation(
    node: LayoutNode<'Datepicker'>,
    { formDataSelector, currentLanguage, nodeDataSelector }: ValidationDataSources,
  ): ComponentValidation[] {
    const field = nodeDataSelector((picker) => picker(node)?.layout.dataModelBindings?.simpleBinding, [node]);
    const data = field ? formDataSelector(field) : undefined;
    const dataAsString = typeof data === 'string' || typeof data === 'number' ? String(data) : undefined;
    if (!dataAsString) {
      return [];
    }

    const minDate = getDateConstraint(
      nodeDataSelector((picker) => picker(node)?.item?.minDate, [node]),
      'min',
    );
    const maxDate = getDateConstraint(
      nodeDataSelector((picker) => picker(node)?.item?.maxDate, [node]),
      'max',
    );
    const format = getDateFormat(
      nodeDataSelector((picker) => picker(node)?.item?.format, [node]),
      currentLanguage,
    );
    const datePickerFormat = getDatepickerFormat(format).toUpperCase();

    const validations: ComponentValidation[] = [];
    const date = strictParseISO(dataAsString);
    if (!date) {
      validations.push({
        message: { key: 'date_picker.invalid_date_message', params: [datePickerFormat] },
        severity: 'error',
        source: FrontendValidationSource.Component,
        category: ValidationMask.Component,
      });
    }

    if (date && isBefore(date, minDate)) {
      validations.push({
        message: { key: 'date_picker.min_date_exeeded' },
        severity: 'error',
        source: FrontendValidationSource.Component,
        category: ValidationMask.Component,
      });
    } else if (date && isAfter(date, maxDate)) {
      validations.push({
        message: { key: 'date_picker.max_date_exeeded' },
        severity: 'error',
        source: FrontendValidationSource.Component,
        category: ValidationMask.Component,
      });
    }

    return validations;
  }

  /**
   * Datepicker has a custom format validation which give a better error message than what the schema provides.
   * Filter out the schema format vaildation to avoid duplicate error messages.
   */
  private schemaFormatFilter(validation: BaseValidation): boolean {
    return !(
      validation.source === FrontendValidationSource.Schema && validation.message.key === 'validation_errors.pattern'
    );
  }

  getValidationFilters(
    _node: LayoutNode<'Datepicker'>,
    _nodeDataSelector: NodeDataSelector,
  ): ValidationFilterFunction[] {
    return [this.schemaFormatFilter];
  }

  validateDataModelBindings(ctx: LayoutValidationCtx<'Datepicker'>): string[] {
    return this.validateDataModelBindingsSimple(ctx);
  }
}
