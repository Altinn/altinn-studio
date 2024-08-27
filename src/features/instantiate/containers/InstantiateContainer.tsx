import React from 'react';

import { isAxiosError } from 'axios';

import { Loader } from 'src/core/loading/Loader';
import { InstantiateValidationError } from 'src/features/instantiate/containers/InstantiateValidationError';
import { MissingRolesError } from 'src/features/instantiate/containers/MissingRolesError';
import { UnknownError } from 'src/features/instantiate/containers/UnknownError';
import { useInstantiation } from 'src/features/instantiate/InstantiationContext';
import { useCurrentParty } from 'src/features/party/PartiesProvider';
import { AltinnAppTheme } from 'src/theme/altinnAppTheme';
import { changeBodyBackground } from 'src/utils/bodyStyling';
import { HttpStatusCodes } from 'src/utils/network/networking';

export const InstantiateContainer = () => {
  changeBodyBackground(AltinnAppTheme.altinnPalette.primary.greyLight);
  const party = useCurrentParty();
  const instantiation = useInstantiation();

  React.useEffect(() => {
    const shouldCreateInstance = !!party && !instantiation.lastResult && !instantiation.isLoading;
    if (shouldCreateInstance) {
      instantiation.instantiate(undefined, party.partyId);
    }
  }, [instantiation, party]);

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

  return <Loader reason={'instantiating'} />;
};
