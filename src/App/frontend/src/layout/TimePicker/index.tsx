import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { DataModels } from 'src/features/datamodel/DataModelsProvider';
import { useDisplayData } from 'src/features/displayData/useDisplayData';
import { useLayoutLookups } from 'src/features/form/layout/LayoutsContext';
import { FrontendValidationSource } from 'src/features/validation';
import { SummaryItemSimple } from 'src/layout/Summary/SummaryItemSimple';
import { TimePickerDef } from 'src/layout/TimePicker/config.def.generated';
import { TimePickerComponent } from 'src/layout/TimePicker/TimePickerComponent';
import { TimePickerSummary } from 'src/layout/TimePicker/TimePickerSummary';
import { useTimePickerValidation } from 'src/layout/TimePicker/useTimePickerValidation';
import { validateDataModelBindingsAny } from 'src/utils/layout/generator/validation/hooks';
import { useNodeFormDataWhenType } from 'src/utils/layout/useNodeItem';
import type { LayoutLookups } from 'src/features/form/layout/makeLayoutLookups';
import type { BaseValidation, ComponentValidation } from 'src/features/validation';
import type {
  PropsFromGenericComponent,
  ValidateComponent,
  ValidationFilter,
  ValidationFilterFunction,
} from 'src/layout';
import type { IDataModelBindings } from 'src/layout/layout';
import type { ExprResolver, SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export class TimePicker extends TimePickerDef implements ValidateComponent, ValidationFilter {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'TimePicker'>>(
    function LayoutComponentTimePickerRender(props, _): JSX.Element | null {
      return <TimePickerComponent {...props} />;
    },
  );

  useDisplayData(baseComponentId: string): string {
    const formData = useNodeFormDataWhenType(baseComponentId, 'TimePicker');
    return formData?.simpleBinding ?? '';
  }

  renderSummary(props: SummaryRendererProps): JSX.Element | null {
    const displayData = useDisplayData(props.targetBaseComponentId);
    return (
      <SummaryItemSimple
        formDataAsString={displayData}
        hideFromVisualTesting={false}
      />
    );
  }

  renderSummary2(props: Summary2Props): JSX.Element | null {
    return <TimePickerSummary {...props} />;
  }

  useComponentValidation(baseComponentId: string): ComponentValidation[] {
    return useTimePickerValidation(baseComponentId);
  }

  private static schemaFormatFilter(validation: BaseValidation): boolean {
    return !(
      validation.source === FrontendValidationSource.Schema && validation.message.key === 'validation_errors.pattern'
    );
  }

  getValidationFilters(_baseComponentId: string, _layoutLookups: LayoutLookups): ValidationFilterFunction[] {
    return [TimePicker.schemaFormatFilter];
  }

  useDataModelBindingValidation(baseComponentId: string, bindings: IDataModelBindings<'TimePicker'>): string[] {
    const lookupBinding = DataModels.useLookupBinding();
    const layoutLookups = useLayoutLookups();
    const _component = useLayoutLookups().getComponent(baseComponentId, 'TimePicker');
    const validation = validateDataModelBindingsAny(
      baseComponentId,
      bindings,
      lookupBinding,
      layoutLookups,
      'simpleBinding',
      ['string'],
    );
    const [errors] = [validation[0] ?? []];

    return errors;
  }

  evalExpressions(props: ExprResolver<'TimePicker'>) {
    return {
      ...this.evalDefaultExpressions(props),
      minTime: props.evalStr(props.item.minTime, ''),
      maxTime: props.evalStr(props.item.maxTime, ''),
    };
  }
}
