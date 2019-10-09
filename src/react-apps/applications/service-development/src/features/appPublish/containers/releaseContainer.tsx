import * as React from 'react';
import { useSelector } from 'react-redux';
import AppReleaseActions from '../../../sharedResources/appRelease/appReleaseDispatcher';
import { IAppReleaseState } from '../../../sharedResources/appRelease/appReleaseReducer';
import { IRelease } from '../../../sharedResources/appRelease/types';

export default function() {
  const appReleases: IAppReleaseState = useSelector((state: IServiceDevelopmentState) => state.appReleases);

  React.useEffect(() => {
    AppReleaseActions.getReleases();
  }, []);

  if (!appReleases.releases || !appReleases.releases.length) {
    return null;
  }
  return (
    <>
      {appReleases.releases.map((release: IRelease, index: number) => (
        <h1 key={index}>{release.name}</h1>
      ))}
    </>
  );
}
