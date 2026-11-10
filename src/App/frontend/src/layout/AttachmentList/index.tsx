import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { AttachmentListComponent } from 'src/layout/AttachmentList/AttachmentListComponent';
import { AttachmentListDef } from 'src/layout/AttachmentList/config.def.generated';
import { SummaryContains, SummaryFlex } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import type { PropsFromGenericComponent } from 'src/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export class AttachmentList extends AttachmentListDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'AttachmentList'>>(
    function LayoutComponentAttachmentListRender(props, _): JSX.Element | null {
      return <AttachmentListComponent {...props} />;
    },
  );

  renderSummary({ targetBaseComponentId }: SummaryRendererProps): JSX.Element | null {
    return <AttachmentListComponent baseComponentId={targetBaseComponentId} />;
  }

  renderSummary2({ targetBaseComponentId }: Summary2Props): JSX.Element | null {
    return (
      <SummaryFlex
        targetBaseId={targetBaseComponentId}
        content={SummaryContains.Presentational}
      >
        <AttachmentListComponent baseComponentId={targetBaseComponentId} />
      </SummaryFlex>
    );
  }
}
