import { createStyles, withStyles } from '@material-ui/core/styles';
import { AxiosError } from 'axios';
import * as React from 'react';
import { AltinnContentLoader, AltinnContentIconFormData } from 'altinn-shared/components';
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

const styles = () => createStyles({
  modal: {
    boxShadow: null,
    MozBoxShadow: null,
    WebkitBoxShadow: null,
  },
});

const titleKey = 'instantiate.starting';

export interface IPartyValidation {
  valid: boolean;
  message: string;
  validParties: IParty[];
}

function InstantiateContainer() {
  changeBodyBackground(AltinnAppTheme.altinnPalette.primary.blue);
  const { org, app } = window as Window as IAltinnWindow;

  const [instantiating, setInstantiating] = React.useState(false);
  const instantiation = useAppSelector(state => state.instantiation);
  const selectedParty = useAppSelector(state => state.party.selectedParty);
  const titleText: any = useAppSelector(state => {
    const text = getTextFromAppOrDefault(titleKey, state.textResources.resources, state.language.language, [], true);
    return text === titleKey ? '' : text;
  });

  const createNewInstance = () => {
    if (!selectedParty) {
      return;
    }
    setInstantiating(true);
    InstantiationActions.instantiate(org, app);
  };

  React.useEffect(() => {
    if (
      !instantiating &&
      !instantiation.instanceId
    ) {
      createNewInstance();
    }
  }, [instantiating]);

  if (instantiation.error !== null && checkIfAxiosError(instantiation.error)) {
    const axiosError = instantiation.error as AxiosError;
    const message = axiosError.response.data?.message;
    if (axiosError.response.status === HttpStatusCodes.Forbidden) {
      if (message) {
        return <InstantiateValidationError message={message} />;
      }
      return (
        <MissingRolesError />
      );
    }

    return (
      <UnknownError />
    );
  }

  if (instantiation.instanceId !== null) {
    return (
      <Redirect to={`/instance/${instantiation.instanceId}`} />
    );
  }

  return (
    <Presentation
      header={titleText}
      type={ProcessTaskType.Unknown}
    >
      <AltinnContentLoader width='100%' height='400'>
        <AltinnContentIconFormData />
      </AltinnContentLoader>
    </Presentation>
  );
}

export default withStyles(styles)(InstantiateContainer);
