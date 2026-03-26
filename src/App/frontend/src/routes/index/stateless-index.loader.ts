import { redirect } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';

import { GlobalData } from 'src/GlobalData';
import { getRawFirstPage } from 'src/utils/computeStartUrl';

export function statelessIndexLoader() {
  return function loader({ request }: LoaderFunctionArgs) {
    const folderId = GlobalData.applicationMetadata.onEntry?.show;
    const firstPage = getRawFirstPage(folderId);
    if (firstPage) {
      const queryKeys = new URL(request.url).search;
      return redirect(`/${firstPage}${queryKeys}`);
    }
    return null;
  };
}
