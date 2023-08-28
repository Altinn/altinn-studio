import React from 'react';

import { IFrameDef } from 'src/layout/IFrame/config.def.generated';
import { IFrameComponent } from 'src/layout/IFrame/IFrameComponent';
import type { IFrameComponentProps } from 'src/layout/IFrame/IFrameComponent';

export class IFrame extends IFrameDef {
  render(props: IFrameComponentProps): JSX.Element | null {
    return <IFrameComponent {...props} />;
  }
}
