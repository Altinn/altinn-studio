import React from 'react';
import { Route, Routes } from 'react-router-dom';

import { ProcessWrapper } from 'src/components/wrappers/ProcessWrapper';
import { Entrypoint } from 'src/features/entrypoint/Entrypoint';
import { InstanceProvider } from 'src/features/instance/InstanceContext';
import { PartySelection } from 'src/features/instantiate/containers/PartySelection';
import { UnknownError } from 'src/features/instantiate/containers/UnknownError';
import { useApplicationMetadataQuery } from 'src/hooks/queries/useApplicationMetadataQuery';
import { useApplicationSettingsQuery } from 'src/hooks/queries/useApplicationSettingsQuery';
import { useFooterLayoutQuery } from 'src/hooks/queries/useFooterLayoutQuery';
import { useCurrentPartyQuery } from 'src/hooks/queries/useGetCurrentPartyQuery';
import { usePartiesQuery } from 'src/hooks/queries/useGetPartiesQuery';
import { useGetTextResourcesQuery } from 'src/hooks/queries/useGetTextResourcesQuery';
import { useLayoutSetsQuery } from 'src/hooks/queries/useLayoutSetsQuery';
import { useOrgsQuery } from 'src/hooks/queries/useOrgsQuery';
import { useProfileQuery } from 'src/hooks/queries/useProfileQuery';
import { useAlwaysPromptForParty } from 'src/hooks/useAlwaysPromptForParty';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { useKeepAlive } from 'src/hooks/useKeepAlive';
import { makeGetAllowAnonymousSelector } from 'src/selectors/getAllowAnonymous';
import { selectAppName, selectAppOwner } from 'src/selectors/language';
import type { IApplicationSettings } from 'src/types/shared';

import '@digdir/design-system-tokens/brand/altinn/tokens.css';

export const App = () => {
  const { data: applicationSettings, isError: hasApplicationSettingsError } = useApplicationSettingsQuery();
  const { data: applicationMetadata, isError: hasApplicationMetadataError } = useApplicationMetadataQuery();
  const { isError: hasLayoutSetError } = useLayoutSetsQuery();
  const { isError: hasOrgsError } = useOrgsQuery();
  useFooterLayoutQuery();

  const componentIsReady = applicationSettings && applicationMetadata;
  const componentHasError =
    hasApplicationSettingsError || hasApplicationMetadataError || hasLayoutSetError || hasOrgsError;

  if (componentHasError) {
    return <UnknownError />;
  }

  if (componentIsReady) {
    return <AppInternal applicationSettings={applicationSettings} />;
  }

  return null;
};

type AppInternalProps = {
  applicationSettings: IApplicationSettings;
};

const AppInternal = ({ applicationSettings }: AppInternalProps): JSX.Element | null => {
  const allowAnonymousSelector = makeGetAllowAnonymousSelector();
  const allowAnonymous = useAppSelector(allowAnonymousSelector);

  const {
    isError: hasProfileError,
    isFetching: isProfileFetching,
    isSuccess: isProfileSucess,
  } = useProfileQuery(allowAnonymous === false);
  const { isError: hasPartiesError, isFetching: isPartiesFetching } = usePartiesQuery(allowAnonymous === false);

  const { isError: hasTextResourceError, isFetching: isTextResourceFetching } = useGetTextResourcesQuery(
    allowAnonymous === true || isProfileSucess,
  );

  const alwaysPromptForParty = useAlwaysPromptForParty();

  const { isError: hasCurrentPartyError } = useCurrentPartyQuery(
    alwaysPromptForParty === false && allowAnonymous === false,
  );

  const appName = useAppSelector(selectAppName);
  const appOwner = useAppSelector(selectAppOwner);

  useKeepAlive(applicationSettings.appOidcProvider, allowAnonymous);

  const hasComponentError = hasProfileError || hasCurrentPartyError || hasPartiesError || hasTextResourceError;
  const isFetching = isProfileFetching || isPartiesFetching || isTextResourceFetching;

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

  const isReadyToRenderRoutes = allowAnonymous !== undefined;
  if (isReadyToRenderRoutes) {
    return (
      <Routes>
        <Route
          path='/'
          element={<Entrypoint />}
        />
        <Route
          path='/partyselection/*'
          element={<PartySelection />}
        />
        <Route
          path='/instance/:partyId/:instanceGuid'
          element={
            <InstanceProvider>
              <ProcessWrapper isFetching={isFetching} />
            </InstanceProvider>
          }
        />
      </Routes>
    );
  }

  if (hasComponentError) {
    return <UnknownError />;
  }

  return null;
};
