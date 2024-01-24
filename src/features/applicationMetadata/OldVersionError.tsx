import React from 'react';

import { InstantiationErrorPage } from 'src/features/instantiate/containers/InstantiationErrorPage';
import { Lang } from 'src/features/language/Lang';

export function OldVersionError({ minVer }: { minVer: string }) {
  return (
    <InstantiationErrorPage
      title={<Lang id='version_error.version_mismatch' />}
      content={
        <>
          <Lang id='version_error.version_mismatch_message' />
          <br />
          <br />
          <Lang
            id='version_error.min_backend_version'
            params={[minVer]}
          />
        </>
      }
    />
  );
}
