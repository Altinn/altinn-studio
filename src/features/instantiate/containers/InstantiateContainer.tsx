import React, { useEffect } from 'react';

import { Loader } from 'src/core/loading/Loader';
import { InstantiateValidationError } from 'src/features/instantiate/containers/InstantiateValidationError';
import { InstantiationClosedError } from 'src/features/instantiate/containers/InstantiationClosedError';
import { MissingRolesError } from 'src/features/instantiate/containers/MissingRolesError';
import { UnknownError } from 'src/features/instantiate/containers/UnknownError';
import { isInstantiationClosedError, useInstantiationClosedReason } from 'src/features/instantiate/instantiationClosed';
import { isInstantiationValidationResult } from 'src/features/instantiate/InstantiationValidation';
import { useInstantiation } from 'src/features/instantiate/useInstantiation';
import { useSelectedParty } from 'src/features/party/PartiesProvider';
import { AltinnPalette } from 'src/theme/altinnAppTheme';
import { changeBodyBackground } from 'src/utils/bodyStyling';
import { isAxiosError } from 'src/utils/isAxiosError';
import { isAuthenticationRedirectError } from 'src/utils/maybeAuthenticationRedirect';
import { HttpStatusCodes } from 'src/utils/network/networking';

export const InstantiateContainer = () => {
  changeBodyBackground(AltinnPalette.greyLight);
  const party = useSelectedParty();
  const instantiation = useInstantiation();
  const closedReason = useInstantiationClosedReason();

  useEffect(() => {
    const shouldCreateInstance = !!party && !closedReason;
    if (shouldCreateInstance) {
      instantiation.instantiate(party.partyId);
    }
  }, [instantiation, party, closedReason]);

  if (closedReason) {
    return <InstantiationClosedError reason={closedReason} />;
  }

  // A 403 with RequiredAuthenticationLevel triggers a step-up redirect (see useInstantiation.onError). Block further
  // rendering with a loader until the browser navigates away, so we never flash the "missing roles" error page. After a
  // successful step-up the level is raised, so a later 403 no longer carries RequiredAuthenticationLevel and the error
  // page renders below instead.
  if (isAuthenticationRedirectError(instantiation.error)) {
    return <Loader reason='authentication-redirect' />;
  }

  if (isInstantiationClosedError(instantiation.error)) {
    return <InstantiationClosedError reason={{ reason: 'closed' }} />;
  }

  if (isAxiosError(instantiation.error) && instantiation.error.response?.status === HttpStatusCodes.Forbidden) {
    if (isInstantiationValidationResult(instantiation.error.response?.data)) {
      return <InstantiateValidationError validationResult={instantiation.error.response.data} />;
    }
    return <MissingRolesError />;
  } else if (instantiation.error) {
    return <UnknownError error={instantiation.error} />;
  }

  return <Loader reason='instantiating' />;
};
