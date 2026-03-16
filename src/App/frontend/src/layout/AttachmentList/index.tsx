import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { AttachmentListComponent } from 'src/layout/AttachmentList/AttachmentListComponent';
import { AttachmentListDef } from 'src/layout/AttachmentList/config.def.generated';
import type { PropsFromGenericComponent } from 'src/layout';

export class AttachmentList extends AttachmentListDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'AttachmentList'>>(
    function LayoutComponentAttachmentListRender(props, _): JSX.Element | null {
      return <AttachmentListComponent {...props} />;
    },
  );
}
