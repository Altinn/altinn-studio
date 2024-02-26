import React, { forwardRef } from 'react';

import dot from 'dot-object';
import moment from 'moment';

import { FrontendValidationSource, ValidationMask } from 'src/features/validation';
import { DatepickerDef } from 'src/layout/Datepicker/config.def.generated';
import { DatepickerComponent } from 'src/layout/Datepicker/DatepickerComponent';
import { SummaryItemSimple } from 'src/layout/Summary/SummaryItemSimple';
import { getDateConstraint, getDateFormat } from 'src/utils/dateHelpers';
import { formatISOString } from 'src/utils/formatDate';
import type { LayoutValidationCtx } from 'src/features/devtools/layoutValidation/types';
import type { BaseValidation, ComponentValidation, ValidationDataSources } from 'src/features/validation';
import type {
  DisplayDataProps,
  PropsFromGenericComponent,
  ValidateComponent,
  ValidationFilter,
  ValidationFilterFunction,
} from 'src/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class Datepicker extends DatepickerDef implements ValidateComponent, ValidationFilter {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'Datepicker'>>(
    function LayoutComponentDatepickerRender(props, _): JSX.Element | null {
      return <DatepickerComponent {...props} />;
    },
  );

  getDisplayData(node: LayoutNode<'Datepicker'>, { currentLanguage }: DisplayDataProps): string {
    if (!node.item.dataModelBindings?.simpleBinding) {
      return '';
    }

    const dateFormat = getDateFormat(node.item.format, currentLanguage);
    const data = node.getFormData().simpleBinding ?? '';
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

  runComponentValidation(
    node: LayoutNode<'Datepicker'>,
    { formData, currentLanguage }: ValidationDataSources,
  ): ComponentValidation[] {
    const field = node.item.dataModelBindings?.simpleBinding;
    const data = field ? dot.pick(field, formData) : undefined;
    const dataAsString = typeof data === 'string' || typeof data === 'number' ? String(data) : undefined;

    if (!dataAsString) {
      return [];
    }

    const minDate = getDateConstraint(node.item.minDate, 'min');
    const maxDate = getDateConstraint(node.item.maxDate, 'max');
    const format = getDateFormat(node.item.format, currentLanguage);

    const validations: ComponentValidation[] = [];

    const date = moment(dataAsString, moment.ISO_8601);

    if (!date.isValid()) {
      validations.push({
        message: { key: 'date_picker.invalid_date_message', params: [format] },
        severity: 'error',
        componentId: node.item.id,
        source: FrontendValidationSource.Component,
        category: ValidationMask.Component,
      });
    }

    if (date.isBefore(minDate)) {
      validations.push({
        message: { key: 'date_picker.min_date_exeeded' },
        severity: 'error',
        componentId: node.item.id,
        source: FrontendValidationSource.Component,
        category: ValidationMask.Component,
      });
    } else if (date.isAfter(maxDate)) {
      validations.push({
        message: { key: 'date_picker.max_date_exeeded' },
        severity: 'error',
        componentId: node.item.id,
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
  formatFilter(validation: BaseValidation): boolean {
    return !(
      validation.source === FrontendValidationSource.Schema && validation.message.key === 'validation_errors.pattern'
    );
  }

  getValidationFilter(_node: LayoutNode): ValidationFilterFunction | null {
    return this.formatFilter;
  }

  validateDataModelBindings(ctx: LayoutValidationCtx<'Datepicker'>): string[] {
    return this.validateDataModelBindingsSimple(ctx);
  }
}
