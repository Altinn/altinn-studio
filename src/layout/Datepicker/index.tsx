import React from 'react';

import dot from 'dot-object';
import moment from 'moment';

import { FrontendValidationSource, ValidationMask } from 'src/features/validation';
import { DatepickerDef } from 'src/layout/Datepicker/config.def.generated';
import { DatepickerComponent } from 'src/layout/Datepicker/DatepickerComponent';
import { SummaryItemSimple } from 'src/layout/Summary/SummaryItemSimple';
import { getDateConstraint, getDateFormat } from 'src/utils/dateHelpers';
import { formatISOString } from 'src/utils/formatDate';
import type { LayoutValidationCtx } from 'src/features/devtools/layoutValidation/types';
import type {
  ComponentValidation,
  FieldValidation,
  ISchemaValidationError,
  ValidationDataSources,
} from 'src/features/validation';
import type { DisplayDataProps, PropsFromGenericComponent, ValidateComponent } from 'src/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class Datepicker extends DatepickerDef implements ValidateComponent {
  render = (props: PropsFromGenericComponent<'Datepicker'>): JSX.Element | null => <DatepickerComponent {...props} />;

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

  // Since the format is validated in component validations, it needs to be ignored in schema validation
  runSchemaValidation(node: LayoutNode<'Datepicker'>, schemaErrors: ISchemaValidationError[]): FieldValidation[] {
    const field = node.item.dataModelBindings?.simpleBinding;
    if (!field) {
      return [];
    }

    const validations: FieldValidation[] = [];

    for (const error of schemaErrors) {
      if (field === error.bindingField && error.keyword !== 'format') {
        validations.push({
          message: error.message,
          severity: 'error',
          field,
          source: FrontendValidationSource.Schema,
          category: ValidationMask.Schema,
        });
      }
    }
    return validations;
  }

  validateDataModelBindings(ctx: LayoutValidationCtx<'Datepicker'>): string[] {
    return this.validateDataModelBindingsSimple(ctx);
  }
}
