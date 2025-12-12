import React from 'react';

import type { CompCustomExternal } from 'src/layout/Custom/config.generated';

export function CustomComponentNext(props: CompCustomExternal) {
  console.log('props for next Custom component:', props);
  return <div>this is a placeholder for Custom component next</div>;
}
