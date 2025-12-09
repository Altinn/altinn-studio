import React from 'react';

import type { CompInputExternal } from 'src/layout/Input/config.generated';

export function InputComponentNext(props: CompInputExternal) {
  console.log(props);
  return (
    <div>
      <pre>{JSON.stringify(props, null, 2)}</pre>

      <input type='text' />
    </div>
  );
}
