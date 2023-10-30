import React from 'react';

import moment from 'moment';

import { DatepickerDef } from 'src/layout/Datepicker/config.def.generated';
import { DatepickerComponent } from 'src/layout/Datepicker/DatepickerComponent';
import { SummaryItemSimple } from 'src/layout/Summary/SummaryItemSimple';
import { getDateConstraint, getDateFormat } from 'src/utils/dateHelpers';
import { formatISOString } from 'src/utils/formatDate';
import { buildValidationObject } from 'src/utils/validation/validationHelpers';
import type { LayoutValidationCtx } from 'src/features/devtools/layoutValidation/types';
import type { IFormData } from 'src/features/formData';
import type { ComponentValidation, PropsFromGenericComponent } from 'src/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { ISchemaValidationError } from 'src/utils/validation/schemaValidation';
import type { IValidationContext, IValidationObject } from 'src/utils/validation/types';

export class Datepicker extends DatepickerDef implements ComponentValidation {
  render(props: PropsFromGenericComponent<'Datepicker'>): JSX.Element | null {
    return <DatepickerComponent {...props} />;
  }

  getDisplayData(node: LayoutNode<'Datepicker'>, { formData, langTools }): string {
    const { selectedLanguage } = langTools;
    if (!node.item.dataModelBindings?.simpleBinding) {
      return '';
    }

    const dateFormat = getDateFormat(node.item.format, selectedLanguage);
    const data = formData[node.item.dataModelBindings?.simpleBinding] || '';
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
    { formData, langTools }: IValidationContext,
    overrideFormData?: IFormData,
  ): IValidationObject[] {
    const formDataToValidate = { ...formData, ...overrideFormData };
    const data = node.item.dataModelBindings?.simpleBinding
      ? formDataToValidate[node.item.dataModelBindings.simpleBinding]
      : undefined;

    if (!data) {
      return [];
    }

    const minDate = getDateConstraint(node.item.minDate, 'min');
    const maxDate = getDateConstraint(node.item.maxDate, 'max');
    const format = getDateFormat(node.item.format, langTools.selectedLanguage);

    const validations: IValidationObject[] = [];
    const date = moment(data, moment.ISO_8601);

    if (!date.isValid()) {
      validations.push(
        buildValidationObject(node, 'errors', langTools.langAsString('date_picker.invalid_date_message', [format])),
      );
    }

    if (date.isBefore(minDate)) {
      validations.push(buildValidationObject(node, 'errors', langTools.langAsString('date_picker.min_date_exeeded')));
    } else if (date.isAfter(maxDate)) {
      validations.push(buildValidationObject(node, 'errors', langTools.langAsString('date_picker.max_date_exeeded')));
    }

    return validations;
  }

  // Since the format is validated in component validations, it needs to be ignored in schema validation
  runSchemaValidation(node: LayoutNode<'Datepicker'>, schemaErrors: ISchemaValidationError[]): IValidationObject[] {
    const bindingField = node.item.dataModelBindings?.simpleBinding;
    if (!bindingField) {
      return [];
    }

    const validationObjects: IValidationObject[] = [];
    for (const error of schemaErrors) {
      if (bindingField === error.bindingField && error.keyword !== 'format') {
        validationObjects.push(
          buildValidationObject(node, 'errors', error.message, 'simpleBinding', error.invalidDataType),
        );
      }
    }
    return validationObjects;
  }

  validateDataModelBindings(ctx: LayoutValidationCtx<'Datepicker'>): string[] {
    return this.validateDataModelBindingsSimple(ctx);
  }
}
