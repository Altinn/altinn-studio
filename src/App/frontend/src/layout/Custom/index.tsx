import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { useDisplayData } from 'src/features/displayData/useDisplayData';
import { CustomDef } from 'src/layout/Custom/config.def.generated';
import { CustomWebComponent } from 'src/layout/Custom/CustomWebComponent';
import { SummaryItemSimple } from 'src/layout/Summary/SummaryItemSimple';
import { useHasBindingsAndNoData } from 'src/layout/Summary2/isEmpty/isEmptyComponent';
import { SummaryContains, SummaryFlex } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { useFormDataFor, useItemWhenType, useNodeFormDataWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export class Custom extends CustomDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'Custom'>>(
    function LayoutComponentCustomRender(props, _): JSX.Element | null {
      return <CustomWebComponent {...props} />;
    },
  );

  useDisplayData(baseComponentId: string): string {
    const formData = useNodeFormDataWhenType(baseComponentId, 'Custom');
    return Object.values(formData ?? {}).join(', ');
  }

  renderSummary(props: SummaryRendererProps): JSX.Element | null {
    const displayData = useDisplayData(props.targetBaseComponentId);
    return <SummaryItemSimple formDataAsString={displayData} />;
  }

  renderSummary2(props: Summary2Props): JSX.Element | null {
    const formData = useFormDataFor<'Custom'>(props.targetBaseComponentId);
    const isEmpty = useHasBindingsAndNoData(props.targetBaseComponentId);
    const required = useItemWhenType(props.targetBaseComponentId, 'Custom').required;
    return (
      <SummaryFlex
        targetBaseId={props.targetBaseComponentId}
        content={
          isEmpty
            ? required
              ? SummaryContains.EmptyValueRequired
              : SummaryContains.EmptyValueNotRequired
            : SummaryContains.SomeUserContent
        }
      >
        <CustomWebComponent
          summaryMode={true}
          formData={formData}
          baseComponentId={props.targetBaseComponentId}
          containerDivRef={React.createRef()}
        />
      </SummaryFlex>
    );
  }

  useDataModelBindingValidation(): string[] {
    return [];
  }
}
