import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { useDisplayData } from 'src/features/displayData/useDisplayData';
import { CustomDef } from 'src/layout/Custom/config.def.generated';
import { CustomWebComponent } from 'src/layout/Custom/CustomWebComponent';
import { SummaryItemSimple } from 'src/layout/Summary/SummaryItemSimple';
import { useNodeFormData, useNodeFormDataWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export class Custom extends CustomDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'Custom'>>(
    function LayoutComponentCustomRender(props, _): JSX.Element | null {
      return <CustomWebComponent {...props} />;
    },
  );

  useDisplayData(nodeId: string): string {
    const formData = useNodeFormDataWhenType(nodeId, 'Custom');
    return Object.values(formData ?? {}).join(', ');
  }

  renderSummary({ targetNode }: SummaryRendererProps<'Custom'>): JSX.Element | null {
    const displayData = useDisplayData(targetNode);
    return <SummaryItemSimple formDataAsString={displayData} />;
  }

  renderSummary2(props: Summary2Props<'Custom'>): JSX.Element | null {
    const formData = useNodeFormData(props.target);
    return (
      <CustomWebComponent
        summaryMode={true}
        formData={formData}
        node={props.target}
        containerDivRef={React.createRef()}
      />
    );
  }

  validateDataModelBindings(): string[] {
    return [];
  }
}
