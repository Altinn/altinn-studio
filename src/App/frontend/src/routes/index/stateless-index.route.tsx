import React from 'react';
import { redirect } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';

import { UnknownError } from 'src/features/instantiate/containers/UnknownError';
import { GlobalData } from 'src/GlobalData';
import { isStateless } from 'src/routes/index/isStateless';
import { getRawFirstPage } from 'src/utils/computeStartUrl';

export function clientLoader({ request }: LoaderFunctionArgs) {
  if (!isStateless()) {
    // redirect is handled by routes/index/index.loader.ts
    return null;
  }

  const folderId = GlobalData.applicationMetadata.onEntry?.show;
  const firstPage = getRawFirstPage(folderId);
  if (!firstPage) {
    throw new Error(`Cannot determine start page for stateless app (folderId=${folderId ?? 'undefined'})`);
  }

  const queryKeys = new URL(request.url).search;
  return redirect(`/${firstPage}${queryKeys}`);
}

export default function StatelessIndex() {
  return <UnknownError error={new Error('Failed to redirect from the stateless index page')} />;
}
