import React, { useEffect } from 'react';
import { useNavigate } from 'react-router';

import { Loader } from 'src/core/loading/Loader';
import { parseInstanceId } from 'src/core/queries/instance';
import { InstantiateValidationError } from 'src/features/instantiate/containers/InstantiateValidationError';
import { MissingRolesError } from 'src/features/instantiate/containers/MissingRolesError';
import { UnknownError } from 'src/features/instantiate/containers/UnknownError';
import { isInstantiationValidationResult } from 'src/features/instantiate/InstantiationValidation';
import { useInstantiation } from 'src/features/instantiate/useInstantiation';
import { useSelectedParty } from 'src/features/party/PartiesProvider';
import { buildInstanceUrl } from 'src/routesBuilder';
import { AltinnPalette } from 'src/theme/altinnAppTheme';
import { changeBodyBackground } from 'src/utils/bodyStyling';
import { isAxiosError } from 'src/utils/isAxiosError';
import { HttpStatusCodes } from 'src/utils/network/networking';

export const InstantiateContainer = () => {
  changeBodyBackground(AltinnPalette.greyLight);
  const party = useSelectedParty();
  const instantiation = useInstantiation();
  const navigate = useNavigate();

  useEffect(() => {
    const createInstance = async () => {
      if (!party) {
        return;
      }
      const data = await instantiation.instantiate(party.partyId);
      const instanceId = data?.id ?? instantiation.lastResult?.id;
      if (instanceId) {
        const { instanceOwnerPartyId, instanceGuid } = parseInstanceId(instanceId);
        navigate(buildInstanceUrl(instanceOwnerPartyId, instanceGuid));
      }
    };
    createInstance();
  }, [instantiation, party, navigate]);

  if (isAxiosError(instantiation.error) && instantiation.error.response?.status === HttpStatusCodes.Forbidden) {
    if (isInstantiationValidationResult(instantiation.error.response?.data)) {
      return <InstantiateValidationError validationResult={instantiation.error.response.data} />;
    }
    return <MissingRolesError />;
  } else if (instantiation.error) {
    return <UnknownError />;
  }

  return <Loader reason='instantiating' />;
};
