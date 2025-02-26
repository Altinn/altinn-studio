import React, { useEffect } from 'react';

import { Loader } from 'src/core/loading/Loader';
import { InstantiateValidationError } from 'src/features/instantiate/containers/InstantiateValidationError';
import { MissingRolesError } from 'src/features/instantiate/containers/MissingRolesError';
import { UnknownError } from 'src/features/instantiate/containers/UnknownError';
import { useInstantiation } from 'src/features/instantiate/InstantiationContext';
import { useCurrentParty } from 'src/features/party/PartiesProvider';
import { useAsRef } from 'src/hooks/useAsRef';
import { AltinnPalette } from 'src/theme/altinnAppTheme';
import { changeBodyBackground } from 'src/utils/bodyStyling';
import { isAxiosError } from 'src/utils/isAxiosError';
import { HttpStatusCodes } from 'src/utils/network/networking';

export const InstantiateContainer = () => {
  changeBodyBackground(AltinnPalette.greyLight);
  const party = useCurrentParty();
  const instantiation = useInstantiation();
  const clearRef = useAsRef(instantiation.clear);

  if (instantiationCleanupTimeout) {
    // If we render this again before the cleanup timeout has run, we should clear it to avoid the cleanup.
    clearTimeout(instantiationCleanupTimeout);
  }

  useEffect(() => {
    const shouldCreateInstance = !!party;
    if (shouldCreateInstance) {
      instantiation.instantiate(party.partyId);
    }
  }, [instantiation, party]);

  // Clear the instantiation when the component is unmounted, to allow users to start a new instance later
  useEffect(() => {
    const clear = clearRef.current;
    return () => {
      if (instantiationCleanupTimeout) {
        clearTimeout(instantiationCleanupTimeout);
      }
      instantiationCleanupTimeout = setTimeout(clear, TIMEOUT);
    };
  }, [clearRef]);

  if (isAxiosError(instantiation.error)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const message = (instantiation.error.response?.data as any)?.message;
    if (instantiation.error.response?.status === HttpStatusCodes.Forbidden) {
      if (message) {
        return <InstantiateValidationError message={message} />;
      }
      return <MissingRolesError />;
    }

    return <UnknownError />;
  }

  return <Loader reason='instantiating' />;
};

/* When this component is unmounted, we clear the instantiation to allow users to start a new instance later. This is
 * needed for (for example) navigating back to party selection or instance selection, and then creating a new instance
 * from there. However, React may decide to unmount this component and then mount it again quickly, so in those
 * cases we want to avoid clearing the instantiation too soon (and cause a bug we had for a while where two instances
 * would be created in quick succession). */
const TIMEOUT = 500;
let instantiationCleanupTimeout: ReturnType<typeof setTimeout> | undefined;
