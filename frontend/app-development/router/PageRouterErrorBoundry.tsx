import React, { ReactElement } from 'react';
import { StudioPageError } from '@studio/components';
import { useRouteError } from 'react-router-dom';

type Error = {
  stack?: string;
  error?: string;
};

export const PageRouterErrorBoundary = (): ReactElement => {
  const error = useRouteError();
  const castedError = error as Error;

  return (
    <>
      <StudioPageError
        title='En ukjent feil oppstod'
        message='Det har oppstått en ukjent feil. Ta kontakt med oss for å få hjelp til å løse dette.'
      />
      <code>{`${castedError} ${castedError?.stack}`}</code>
    </>
  );
};
