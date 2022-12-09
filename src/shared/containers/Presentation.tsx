import * as React from 'react';

import { useAppDispatch, useAppSelector } from 'src/common/hooks';
import Header from 'src/components/presentation/Header';
import NavBar from 'src/components/presentation/NavBar';
import { AltinnAppHeader, AltinnSubstatusPaper } from 'src/components/shared';
import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';
import { getLayoutOrderFromTracks } from 'src/selectors/getLayoutOrder';
import { AltinnAppTheme } from 'src/theme';
import { PresentationType, ProcessTaskType } from 'src/types';
import { getNextView } from 'src/utils/formLayout';
import { get } from 'src/utils/network/networking';
import { getTextResourceByKey, returnUrlFromQueryParameter, returnUrlToMessagebox } from 'src/utils/sharedUtils';
import { getRedirectUrl } from 'src/utils/urls/appUrlHelper';

export interface IPresentationProvidedProps {
  header?: string | JSX.Element | JSX.Element[];
  appOwner?: string;
  type: ProcessTaskType | PresentationType;
  children?: JSX.Element;
}

const style = {
  marginBottom: '1rem',
};

const PresentationComponent = (props: IPresentationProvidedProps) => {
  const dispatch = useAppDispatch();
  const party = useAppSelector((state) => state.party?.selectedParty);
  const language = useAppSelector((state) => state.language.language || {});
  const instance = useAppSelector((state) => state.instanceData?.instance);
  const userParty = useAppSelector((state) => state.profile.profile?.party);
  const textResources = useAppSelector((state) => state.textResources.resources);

  const previousFormPage: string = useAppSelector((state) =>
    getNextView(
      state.formLayout.uiConfig.navigationConfig &&
        state.formLayout.uiConfig.navigationConfig[state.formLayout.uiConfig.currentView],
      getLayoutOrderFromTracks(state.formLayout.uiConfig.tracks),
      state.formLayout.uiConfig.currentView,
      true,
    ),
  );
  const returnToView = useAppSelector((state) => state.formLayout.uiConfig.returnToView);

  const handleBackArrowButton = () => {
    if (returnToView) {
      dispatch(
        FormLayoutActions.updateCurrentView({
          newView: returnToView,
          runValidations: 'allPages',
        }),
      );
    } else if (props.type === ProcessTaskType.Data || props.type === PresentationType.Stateless) {
      dispatch(FormLayoutActions.updateCurrentView({ newView: previousFormPage }));
    }
  };

  const handleModalCloseButton = () => {
    const queryParameterReturnUrl = returnUrlFromQueryParameter();
    const messageBoxUrl = returnUrlToMessagebox(window.location.origin, party?.partyId);
    if (!queryParameterReturnUrl && messageBoxUrl) {
      window.location.href = messageBoxUrl;
      return;
    }

    if (queryParameterReturnUrl) {
      get(getRedirectUrl(queryParameterReturnUrl))
        .then((response) => response)
        .catch(() => messageBoxUrl)
        .then((returnUrl) => {
          window.location.href = returnUrl;
        });
    }
  };

  const isProcessStepsArchived = Boolean(props.type === ProcessTaskType.Archived);
  const backgroundColor = isProcessStepsArchived
    ? AltinnAppTheme.altinnPalette.primary.greenLight
    : AltinnAppTheme.altinnPalette.primary.greyLight;
  document.body.style.background = backgroundColor;

  return (
    <div
      id='processContainer'
      style={style}
    >
      <AltinnAppHeader
        party={party || undefined}
        userParty={userParty}
        logoColor={AltinnAppTheme.altinnPalette.primary.blueDarker}
        headerBackgroundColor={backgroundColor}
        language={language}
      />
      <main className='container'>
        <div className='row'>
          <div className='col-xl-12 a-p-static'>
            {isProcessStepsArchived && instance?.status?.substatus && (
              <AltinnSubstatusPaper
                label={getTextResourceByKey(instance.status.substatus.label, textResources)}
                description={getTextResourceByKey(instance.status.substatus.description, textResources)}
              />
            )}
            <NavBar
              handleClose={handleModalCloseButton}
              handleBack={handleBackArrowButton}
              showBackArrow={
                !!previousFormPage && (props.type === ProcessTaskType.Data || props.type === PresentationType.Stateless)
              }
            />
            <div className='a-modal-content-target'>
              <div className='a-page a-current-page'>
                <div className='modalPage'>
                  <section
                    className='modal-content'
                    id='main-content'
                  >
                    <Header {...props} />
                    <div className='modal-body a-modal-body'>{props.children}</div>
                  </section>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PresentationComponent;
