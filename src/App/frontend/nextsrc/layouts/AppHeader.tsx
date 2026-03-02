import React from 'react';

import { Heading } from '@digdir/designsystemet-react';

import { GlobalData } from 'nextsrc/core/globalData';
import { useLanguage } from 'nextsrc/libs/form-client/react/useLanguage';

import classes from 'src/components/presentation/Header.module.css';

export function AppHeader() {
  const { langAsString } = useLanguage();

  const appOwner = getAppOwner(langAsString);
  const appName = getAppName(langAsString);

  return (
    <header className={classes.wrapper}>
      {appOwner && <span>{appOwner}</span>}
      <Heading
        level={1}
        data-size='md'
        data-testid='presentation-heading'
      >
        {appName}
      </Heading>
    </header>
  );
}

function getAppOwner(langAsString: (key: string) => string): string | undefined {
  const resolved = langAsString('appOwner');
  if (resolved !== 'appOwner') {
    return resolved;
  }
  return GlobalData.orgName?.nb ?? undefined;
}

function getAppName(langAsString: (key: string) => string): string {
  const resolved = langAsString('appName');
  if (resolved !== 'appName') {
    return resolved;
  }
  const serviceName = langAsString('ServiceName');
  if (serviceName !== 'ServiceName') {
    return serviceName;
  }
  return GlobalData.app;
}
