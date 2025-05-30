import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { useDisplayData } from 'src/features/displayData/useDisplayData';
import { SummaryItemSimple } from 'src/layout/Summary/SummaryItemSimple';
import { TextAreaDef } from 'src/layout/TextArea/config.def.generated';
import { TextAreaComponent } from 'src/layout/TextArea/TextAreaComponent';
import { TextAreaSummary } from 'src/layout/TextArea/TextAreaSummary';
import { useNodeFormDataWhenType } from 'src/utils/layout/useNodeItem';
import type { LayoutValidationCtx } from 'src/features/devtools/layoutValidation/types';
import type { PropsFromGenericComponent } from 'src/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export class TextArea extends TextAreaDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'TextArea'>>(
    function LayoutComponentTextAreaRender(props, _): JSX.Element | null {
      return <TextAreaComponent {...props} />;
    },
  );

  useDisplayData(nodeId: string): string {
    const formData = useNodeFormDataWhenType(nodeId, 'TextArea');
    return formData?.simpleBinding ?? '';
  }

  renderSummary({ targetNode }: SummaryRendererProps<'TextArea'>): JSX.Element | null {
    const displayData = useDisplayData(targetNode);
    return (
      <SummaryItemSimple
        formDataAsString={displayData}
        multiline
      />
    );
  }

  renderSummary2(props: Summary2Props<'TextArea'>): JSX.Element | null {
    return <TextAreaSummary {...props} />;
  }

  validateDataModelBindings(ctx: LayoutValidationCtx<'TextArea'>): string[] {
    return this.validateDataModelBindingsSimple(ctx);
  }
}
