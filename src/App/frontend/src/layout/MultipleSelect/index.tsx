import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import dot from 'dot-object';

import { useLanguage } from 'src/features/language/useLanguage';
import { getCommaSeparatedOptionsToText } from 'src/features/options/getCommaSeparatedOptionsToText';
import { useOptionsFor } from 'src/features/options/useOptionsFor';
import { validateSimpleBindingWithOptionalGroup } from 'src/features/saveToGroup/layoutValidation';
import { ObjectToGroupLayoutValidator } from 'src/features/saveToGroup/ObjectToGroupLayoutValidator';
import { validateGroupIsEmpty } from 'src/features/saveToGroup/useValidateGroupIsEmpty';
import { MultipleChoiceSummary } from 'src/layout/Checkboxes/MultipleChoiceSummary';
import { MultipleSelectDef } from 'src/layout/MultipleSelect/config.def.generated';
import { MultipleSelectComponent } from 'src/layout/MultipleSelect/MultipleSelectComponent';
import { MultipleSelectSummary } from 'src/layout/MultipleSelect/MultipleSelectSummary';
import { useDataModelBindingsFor } from 'src/utils/layout/hooks';
import { useNodeFormDataWhenType } from 'src/utils/layout/useNodeItem';
import type { ComponentValidation } from 'src/features/validation';
import type {
  ComponentValidationContext,
  DataModelBindingValidationContext,
  PropsFromGenericComponent,
} from 'src/layout';
import type { ComponentLayoutValidationProps, IDataModelBindings } from 'src/layout/layout';
import type { ExprResolver, SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

type Row = Record<string, string | number | boolean>;

export class MultipleSelect extends MultipleSelectDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'MultipleSelect'>>(
    function LayoutComponentMultipleSelectRender(props, _): JSX.Element | null {
      return <MultipleSelectComponent {...props} />;
    },
  );

  getOptionsEffectValueType() {
    return 'multi' as const;
  }

  useDisplayData(baseComponentId: string): string {
    const formData = useNodeFormDataWhenType(baseComponentId, 'MultipleSelect');
    const options = useOptionsFor(baseComponentId, 'multi').options;
    const langAsString = useLanguage().langAsString;

    const dataModelBindings = useDataModelBindingsFor(baseComponentId, 'MultipleSelect');
    const relativeCheckedPath =
      dataModelBindings?.checked && dataModelBindings?.group
        ? dataModelBindings.checked.field.replace(`${dataModelBindings.group.field}.`, '')
        : undefined;

    const relativeSimpleBindingPath =
      dataModelBindings?.simpleBinding && dataModelBindings?.group
        ? dataModelBindings.simpleBinding.field.replace(`${dataModelBindings.group.field}.`, '')
        : undefined;

    const displayRows = (formData?.group as unknown as Row[])
      ?.filter((row) => (!relativeCheckedPath ? true : dot.pick(relativeCheckedPath, row) === true))
      .map((row) => (!relativeSimpleBindingPath ? true : dot.pick(relativeSimpleBindingPath, row)));

    const data = dataModelBindings?.group
      ? displayRows
      : getCommaSeparatedOptionsToText(formData?.simpleBinding, options, langAsString);

    return Object.values(data).join(', ');
  }

  evalExpressions(props: ExprResolver<'MultipleSelect'>) {
    return {
      ...this.evalDefaultExpressions(props),
      alertOnChange: props.evalBool(props.item.alertOnChange, false),
    };
  }

  renderSummary(props: SummaryRendererProps): JSX.Element | null {
    return <MultipleChoiceSummary {...props} />;
  }

  renderSummary2(props: Summary2Props): JSX.Element | null {
    return <MultipleSelectSummary {...props} />;
  }

  validateEmptyField(ctx: ComponentValidationContext<'MultipleSelect'>): ComponentValidation[] {
    return validateGroupIsEmpty(ctx);
  }

  renderLayoutValidators(props: ComponentLayoutValidationProps<'MultipleSelect'>): JSX.Element | null {
    return <ObjectToGroupLayoutValidator {...props} />;
  }

  validateDataModelBindings(
    baseComponentId: string,
    bindings: IDataModelBindings<'MultipleSelect'>,
    context: DataModelBindingValidationContext,
  ): string[] {
    return validateSimpleBindingWithOptionalGroup(baseComponentId, bindings, context);
  }
}
