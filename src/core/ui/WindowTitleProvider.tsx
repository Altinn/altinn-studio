import React from 'react';
import type { PropsWithChildren } from 'react';

import { useAppName, useAppOwner } from 'src/core/texts/appTexts';

export function WindowTitleProvider({ children }: PropsWithChildren) {
  const appName = useAppName();
  const appOwner = useAppOwner();

  // Set the title of the app
  React.useEffect(() => {
    if (appName && appOwner) {
      document.title = `${appName} - ${appOwner}`;
    } else if (appName && !appOwner) {
      document.title = appName;
    } else if (!appName && appOwner) {
      document.title = appOwner;
    }
  }, [appOwner, appName]);

  return <>{children}</>;
}
