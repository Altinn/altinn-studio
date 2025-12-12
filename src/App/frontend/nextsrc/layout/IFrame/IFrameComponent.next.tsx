import React from 'react';

import type { CompIFrameExternal } from 'src/layout/IFrame/config.generated';

export function IFrameComponentNext(props: CompIFrameExternal) {
  console.log('props for next IFrame component:', props);
  return <div>this is a placeholder for IFrame component next</div>;
}
