import React from 'react';
import type { PropsWithChildren } from 'react';

import {
  MINIMUM_APPLICATION_VERSION,
  useApplicationMetadata,
} from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { InstantiationErrorPage } from 'src/features/instantiate/containers/InstantiationErrorPage';
import { Lang } from 'src/features/language/Lang';

export function VersionErrorOrChildren({ children }: PropsWithChildren) {
  const { isValidVersion } = useApplicationMetadata();

  return isValidVersion ? (
    children
  ) : (
    <InstantiationErrorPage
      title={<Lang id='version_error.version_mismatch' />}
      content={
        <>
          <Lang id='version_error.version_mismatch_message' />
          <br />
          <br />
          <Lang
            id='version_error.min_backend_version'
            params={[MINIMUM_APPLICATION_VERSION.name]}
          />
        </>
      }
    />
  );
}
