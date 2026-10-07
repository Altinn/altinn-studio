import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { useDisplayData } from 'src/features/displayData/useDisplayData';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { getMapToReactNumberConfig } from 'src/hooks/useMapToReactNumberConfig';
import { InputDef } from 'src/layout/Input/config.def.generated';
import { useResolvedFormatting } from 'src/layout/Input/formatting';
import { InputComponent } from 'src/layout/Input/InputComponent';
import { InputSummary } from 'src/layout/Input/InputSummary';
import { SummaryItemSimple } from 'src/layout/Summary/SummaryItemSimple';
import { formatNumericText } from 'src/utils/formattingUtils';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useNodeFormDataWhenType } from 'src/utils/layout/useFormData';
import { validateDataModelBindingsSimple } from 'src/utils/layout/validation/utils';
import type { DataModelBindingValidationContext, PropsFromGenericComponent } from 'src/layout';
import type { IDataModelBindings } from 'src/layout/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export class Input extends InputDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'Input'>>(
    function LayoutComponentInputRender(props, _): JSX.Element | null {
      return <InputComponent {...props} />;
    },
  );

  useDisplayData(baseComponentId: string): string {
    const formData = useNodeFormDataWhenType(baseComponentId, 'Input');
    const config = useComponentConfig(baseComponentId, 'Input');
    const formatting = useResolvedFormatting(config.formatting);
    const currentLanguage = useCurrentLanguage();
    const text = formData?.simpleBinding || '';
    if (!text) {
      return '';
    }

    const numberFormatting = getMapToReactNumberConfig(formatting, text, currentLanguage);
    if (numberFormatting?.number) {
      return formatNumericText(text, numberFormatting.number);
    }

    return text;
  }

  renderSummary({ targetBaseComponentId }: SummaryRendererProps): JSX.Element | null {
    const displayData = useDisplayData(targetBaseComponentId);
    return <SummaryItemSimple formDataAsString={displayData} />;
  }

  renderSummary2(props: Summary2Props): JSX.Element | null {
    return <InputSummary {...props} />;
  }

  validateDataModelBindings(
    baseComponentId: string,
    bindings: IDataModelBindings<'Input'>,
    { lookupBinding, layoutLookups }: DataModelBindingValidationContext,
  ): string[] {
    return validateDataModelBindingsSimple(baseComponentId, bindings, lookupBinding, layoutLookups);
  }
}
