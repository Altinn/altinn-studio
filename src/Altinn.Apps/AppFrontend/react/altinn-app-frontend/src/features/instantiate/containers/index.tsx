import { createStyles, withStyles, WithStyles } from '@material-ui/core/styles';
import { AxiosError } from 'axios';
import * as React from 'react';
import { useSelector } from 'react-redux';
import { AltinnContentLoader, AltinnContentIconFormData } from 'altinn-shared/components';
import { Redirect } from 'react-router-dom';
import { AltinnAppTheme } from 'altinn-shared/theme';
import { IParty } from 'altinn-shared/types';
import { checkIfAxiosError } from 'altinn-shared/utils';
import { getTextFromAppOrDefault } from 'src/utils/textResource';
import Presentation from 'src/shared/containers/Presentation';
import { IAltinnWindow, IRuntimeState, ProcessTaskType } from '../../../types';
import { changeBodyBackground } from '../../../utils/bodyStyling';
import { HttpStatusCodes } from '../../../utils/networking';
import { post } from '../../../utils/networking';
import InstantiationActions from '../instantiation/actions';
import MissingRolesError from './MissingRolesError';
import NoValidPartiesError from './NoValidPartiesError';
import UnknownError from './UnknownError';
import InstantiateValidationError from './InstantiateValidationError';

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

export interface IServiceInfoProps extends WithStyles<typeof styles> {
  // intentionally left empty
}

function InstantiateContainer() {
  changeBodyBackground(AltinnAppTheme.altinnPalette.primary.blue);
  const { org, app } = window as Window as IAltinnWindow;

  const [partyValidation, setPartyValidation] = React.useState(null);
  const [instantiating, setInstantiating] = React.useState(false);

  const instantiation = useSelector((state: IRuntimeState) => state.instantiation);
  const selectedParty = useSelector((state: IRuntimeState) => state.party.selectedParty);
  const titleText: any = useSelector((state: IRuntimeState) => {
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

  const validatatePartySelection = async () => {
    if (!selectedParty) {
      return;
    }
    try {
      const { data } = await post(
        `${window.location.origin}/${org}/${app}/api/v1/parties/` +
        `validateInstantiation?partyId=${selectedParty.partyId}`,
      );
      setPartyValidation(data);
    } catch (err) {
      console.error(err);
      throw new Error('Server did not respond with party validation');
    }
  };

  React.useEffect(() => {
    validatatePartySelection();
  }, [selectedParty]);

  React.useEffect(() => {
    if (partyValidation !== null) {
      // validations
    }
  }, [partyValidation]);

  React.useEffect(() => {
    if (
      partyValidation !== null &&
      partyValidation.valid &&
      !instantiating &&
      !instantiation.instanceId
    ) {
      createNewInstance();
    }
  }, [partyValidation, instantiating, selectedParty]);

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

  if (partyValidation !== null && !partyValidation.valid) {
    if (partyValidation.validParties !== null &&
      partyValidation.validParties.length === 0) {
      return (
        <NoValidPartiesError />
      );
    }
    return (
      <Redirect to={`/partyselection/${HttpStatusCodes.Forbidden}`} />
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
