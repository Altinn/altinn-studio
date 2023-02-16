import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

import { useAppDispatch } from 'src/common/hooks/useAppDispatch';
import { useAppSelector } from 'src/common/hooks/useAppSelector';
import { useInstanceIdParams } from 'src/common/hooks/useInstanceIdParams';
import { AltinnContentIconFormData } from 'src/components/atoms/AltinnContentIconFormData';
import { AltinnContentLoader } from 'src/components/molecules/AltinnContentLoader';
import { InstantiateValidationError } from 'src/features/instantiate/containers/InstantiateValidationError';
import { MissingRolesError } from 'src/features/instantiate/containers/MissingRolesError';
import { UnknownError } from 'src/features/instantiate/containers/UnknownError';
import { InstantiationActions } from 'src/features/instantiate/instantiation/instantiationSlice';
import { PresentationComponent } from 'src/shared/containers/Presentation';
import { AltinnAppTheme } from 'src/theme/altinnAppTheme';
import { ProcessTaskType } from 'src/types';
import { changeBodyBackground } from 'src/utils/bodyStyling';
import { HttpStatusCodes } from 'src/utils/network/networking';
import { isAxiosError } from 'src/utils/network/sharedNetworking';
import { getTextFromAppOrDefault } from 'src/utils/textResource';

const titleKey = 'instantiate.starting';

export const InstantiateContainer = () => {
  changeBodyBackground(AltinnAppTheme.altinnPalette.primary.greyLight);
  const dispatch = useAppDispatch();
  const instantiation = useAppSelector((state) => state.instantiation);
  const selectedParty = useAppSelector((state) => state.party.selectedParty);
  const titleText = useAppSelector((state) => {
    const text = getTextFromAppOrDefault(
      titleKey,
      state.textResources.resources,
      state.language.language || {},
      [],
      true,
    );
    return text === titleKey ? '' : text;
  });

  React.useEffect(() => {
    const shouldCreateInstance =
      !instantiation.instantiating && !instantiation.instanceId && !instantiation.error && selectedParty;
    if (shouldCreateInstance) {
      dispatch(InstantiationActions.instantiate());
    }
  }, [selectedParty, instantiation.instantiating, instantiation.instanceId, instantiation.error, dispatch]);
  const { instanceId } = useInstanceIdParams();
  if (isAxiosError(instantiation.error)) {
    const message = (instantiation.error.response?.data as any)?.message;
    if (instantiation.error.response?.status === HttpStatusCodes.Forbidden) {
      if (message) {
        return <InstantiateValidationError message={message} />;
      }
      return <MissingRolesError />;
    }

    return <UnknownError />;
  }
  if (instantiation.instanceId !== null) {
    if (!instanceId) {
      return (
        <Navigate
          to={`instance/${instantiation.instanceId}`}
          replace
        />
      );
    }
    return <Outlet />;
  }

  return (
    <PresentationComponent
      header={titleText}
      type={ProcessTaskType.Unknown}
    >
      <AltinnContentLoader
        width='100%'
        height='400'
      >
        <AltinnContentIconFormData />
      </AltinnContentLoader>
    </PresentationComponent>
  );
};
