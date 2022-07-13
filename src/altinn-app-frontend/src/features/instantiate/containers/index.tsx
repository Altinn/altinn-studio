import * as React from 'react';
import {
  AltinnContentLoader,
  AltinnContentIconFormData,
} from 'altinn-shared/components';
import { Redirect } from 'react-router-dom';
import { AltinnAppTheme } from 'altinn-shared/theme';
import { isAxiosError } from 'altinn-shared/utils';
import { getTextFromAppOrDefault } from 'src/utils/textResource';
import Presentation from 'src/shared/containers/Presentation';
import { ProcessTaskType } from '../../../types';
import { changeBodyBackground } from '../../../utils/bodyStyling';
import { HttpStatusCodes } from '../../../utils/networking';
import MissingRolesError from './MissingRolesError';
import UnknownError from './UnknownError';
import InstantiateValidationError from './InstantiateValidationError';
import { useAppSelector, useAppDispatch } from 'src/common/hooks';
import { InstantiationActions } from 'src/features/instantiate/instantiation/instantiationSlice';

const titleKey = 'instantiate.starting';

const InstantiateContainer = () => {
  changeBodyBackground(AltinnAppTheme.altinnPalette.primary.greyLight);

  const dispatch = useAppDispatch();
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
      !instantiation.instantiating &&
      !instantiation.instanceId &&
      selectedParty;
    if (shouldCreateInstance) {
      dispatch(InstantiationActions.instantiate());
    }
  }, [
    selectedParty,
    instantiation.instantiating,
    instantiation.instanceId,
    dispatch,
  ]);

  if (isAxiosError(instantiation.error)) {
    const message = (instantiation.error.response.data as any)?.message;
    if (instantiation.error.response.status === HttpStatusCodes.Forbidden) {
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
    <Presentation
      header={titleText}
      type={ProcessTaskType.Unknown}
    >
      <AltinnContentLoader
        width='100%'
        height='400'
      >
        <AltinnContentIconFormData />
      </AltinnContentLoader>
    </Presentation>
  );
};

export default InstantiateContainer;
