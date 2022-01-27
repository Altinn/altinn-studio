import * as React from 'react';
import { AxiosError } from 'axios';
import {
  AltinnContentLoader,
  AltinnContentIconFormData,
} from 'altinn-shared/components';
import { Redirect } from 'react-router-dom';
import { AltinnAppTheme } from 'altinn-shared/theme';
import { IParty } from 'altinn-shared/types';
import { checkIfAxiosError } from 'altinn-shared/utils';
import { getTextFromAppOrDefault } from 'src/utils/textResource';
import Presentation from 'src/shared/containers/Presentation';
import { IAltinnWindow, ProcessTaskType } from '../../../types';
import { changeBodyBackground } from '../../../utils/bodyStyling';
import { HttpStatusCodes } from '../../../utils/networking';
import InstantiationActions from '../instantiation/actions';
import MissingRolesError from './MissingRolesError';
import UnknownError from './UnknownError';
import InstantiateValidationError from './InstantiateValidationError';
import { useAppSelector } from 'src/common/hooks';

const titleKey = 'instantiate.starting';

export interface IPartyValidation {
  valid: boolean;
  message: string;
  validParties: IParty[];
}

const InstantiateContainer = () => {
  changeBodyBackground(AltinnAppTheme.altinnPalette.primary.greyLight);

  const [instantiating, setInstantiating] = React.useState(false);
  const instantiation = useAppSelector((state) => state.instantiation);
  const selectedParty = useAppSelector((state) => state.party.selectedParty);
  const titleText = useAppSelector((state) => {
    const text = getTextFromAppOrDefault(
      titleKey,
      state.textResources.resources,
      state.language.language,
      [],
      true,
    );
    return text === titleKey ? '' : text;
  });

  React.useEffect(() => {
    const shouldCreateInstance =
      !instantiating && !instantiation.instanceId && selectedParty;

    if (shouldCreateInstance) {
      const { org, app } = window as Window as IAltinnWindow;
      setInstantiating(true);
      InstantiationActions.instantiate(org, app);
    }
  }, [instantiating, selectedParty, instantiation.instanceId]);

  if (instantiation.error !== null && checkIfAxiosError(instantiation.error)) {
    const axiosError = instantiation.error as AxiosError;
    const message = axiosError.response.data?.message;
    if (axiosError.response.status === HttpStatusCodes.Forbidden) {
      if (message) {
        return <InstantiateValidationError message={message} />;
      }
      return <MissingRolesError />;
    }

    return <UnknownError />;
  }

  if (instantiation.instanceId !== null) {
    return <Redirect to={`/instance/${instantiation.instanceId}`} />;
  }

  return (
    <Presentation header={titleText} type={ProcessTaskType.Unknown}>
      <AltinnContentLoader width='100%' height='400'>
        <AltinnContentIconFormData />
      </AltinnContentLoader>
    </Presentation>
  );
};

export default InstantiateContainer;
