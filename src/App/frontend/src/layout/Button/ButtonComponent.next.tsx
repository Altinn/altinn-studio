import React from 'react';

import type { CompButtonExternal } from 'src/layout/Button/config.generated';

export function ButtonComponentNext(props: CompButtonExternal) {
  console.log('props for next Button component:', props);

  if (props.mode === 'submit') {
    return <button>submit</button>;
  }

  if (props.mode === 'instantiate') {
    return <button>instantiate</button>;
  }

  if (props.mode === 'save') {
    return <button>save</button>;
  }

  return <button>submit</button>;
}
