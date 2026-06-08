import { redirect } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';

import { GlobalData } from 'src/GlobalData';
import { isStateless } from 'src/routes/index/isStateless';
import { getRawFirstPage } from 'src/utils/computeStartUrl';

export function statelessIndexLoader() {
  return function loader({ request }: LoaderFunctionArgs) {
    if (!isStateless()) {
      return null;
    }

    const folderId = GlobalData.applicationMetadata.onEntry?.show;
    const firstPage = getRawFirstPage(folderId);
    if (!firstPage) {
      throw new Error(`Cannot determine start page for stateless app (folderId=${folderId ?? 'undefined'})`);
    }

    const queryKeys = new URL(request.url).search;
    return redirect(`/${firstPage}${queryKeys}`);
  };
}
