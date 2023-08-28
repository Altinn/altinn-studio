import React from 'react';

import { AttachmentListComponent } from 'src/layout/AttachmentList/AttachmentListComponent';
import { AttachmentListDef } from 'src/layout/AttachmentList/config.def.generated';
import type { PropsFromGenericComponent } from 'src/layout';

export class AttachmentList extends AttachmentListDef {
  render(props: PropsFromGenericComponent<'AttachmentList'>): JSX.Element | null {
    return <AttachmentListComponent {...props} />;
  }
}
