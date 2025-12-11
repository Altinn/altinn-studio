import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { DataModels } from 'src/features/datamodel/DataModelsProvider';
import { useDisplayData } from 'src/features/displayData/useDisplayData';
import { useLayoutLookups } from 'src/features/form/layout/LayoutsContext';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { getMapToReactNumberConfig } from 'src/hooks/useMapToReactNumberConfig';
import { InputDef } from 'src/layout/Input/config.def.generated';
import { evalFormatting } from 'src/layout/Input/formatting';
import { InputComponent } from 'src/layout/Input/InputComponent';
import { InputSummary } from 'src/layout/Input/InputSummary';
import { SummaryItemSimple } from 'src/layout/Summary/SummaryItemSimple';
import { formatNumericText } from 'src/utils/formattingUtils';
import { validateDataModelBindingsSimple } from 'src/utils/layout/generator/validation/hooks';
import { useItemWhenType, useNodeFormDataWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';
import type { IDataModelBindings } from 'src/layout/layout';
import type { ExprResolver, SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export class Input extends InputDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'Input'>>(
    function LayoutComponentInputRender(props, _): JSX.Element | null {
      return <InputComponent {...props} />;
    },
  );

  useDisplayData(baseComponentId: string): string {
    const formData = useNodeFormDataWhenType(baseComponentId, 'Input');
    const item = useItemWhenType(baseComponentId, 'Input');
    const formatting = item?.formatting;
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

  useDataModelBindingValidation(baseComponentId: string, bindings: IDataModelBindings<'Input'>): string[] {
    const lookupBinding = DataModels.useLookupBinding();
    const layoutLookups = useLayoutLookups();
    return validateDataModelBindingsSimple(baseComponentId, bindings, lookupBinding, layoutLookups);
  }

  evalExpressions(props: ExprResolver<'Input'>) {
    return {
      ...this.evalDefaultExpressions(props),
      formatting: evalFormatting(props),
    };
  }
}
