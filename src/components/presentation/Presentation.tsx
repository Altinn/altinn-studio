import React from 'react';
import type { PropsWithChildren } from 'react';

import Grid from '@material-ui/core/Grid';
import cn from 'classnames';

import { LogoColor } from 'src/components/logo/AltinnLogo';
import { AltinnSubstatusPaper } from 'src/components/molecules/AltinnSubstatusPaper';
import { AltinnAppHeader } from 'src/components/organisms/AltinnAppHeader';
import { Header } from 'src/components/presentation/Header';
import { NavBar } from 'src/components/presentation/NavBar';
import classes from 'src/components/presentation/Presentation.module.css';
import { Progress } from 'src/components/presentation/Progress';
import { Footer } from 'src/features/footer/Footer';
import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';
import { useLaxInstanceData } from 'src/features/instance/InstanceContext';
import { useLanguage } from 'src/features/language/useLanguage';
import { useCurrentParty } from 'src/features/party/PartiesProvider';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { selectPreviousAndNextPage } from 'src/selectors/getLayoutOrder';
import { AltinnAppTheme } from 'src/theme/altinnAppTheme';
import { PresentationType, ProcessTaskType } from 'src/types';
import { httpGet } from 'src/utils/network/networking';
import { getRedirectUrl } from 'src/utils/urls/appUrlHelper';
import { returnUrlFromQueryParameter, returnUrlToMessagebox } from 'src/utils/urls/urlHelper';

export interface IPresentationProvidedProps extends PropsWithChildren {
  header?: React.ReactNode;
  type: ProcessTaskType | PresentationType;
}

export const PresentationComponent = ({ header, type, children }: IPresentationProvidedProps) => {
  const dispatch = useAppDispatch();
  const { lang, langAsString } = useLanguage();
  const party = useCurrentParty();
  const instance = useLaxInstanceData();
  const userParty = useAppSelector((state) => state.profile.profile?.party);
  const { expandedWidth } = useAppSelector((state) => state.formLayout.uiConfig);
  const { previous } = useAppSelector(selectPreviousAndNextPage);
  const returnToView = useAppSelector((state) => state.formLayout.uiConfig.returnToView);

  const realHeader = header || (type === ProcessTaskType.Archived ? lang('receipt.receipt') : undefined);

  const handleBackArrowButton = () => {
    if (returnToView) {
      dispatch(
        FormLayoutActions.updateCurrentView({
          newView: returnToView,
        }),
      );
    } else if (previous !== undefined && (type === ProcessTaskType.Data || type === PresentationType.Stateless)) {
      dispatch(
        FormLayoutActions.updateCurrentView({
          newView: previous,
        }),
      );
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
      httpGet(getRedirectUrl(queryParameterReturnUrl))
        .then((response) => response)
        .catch(() => messageBoxUrl)
        .then((returnUrl) => {
          window.location.href = returnUrl;
        });
    }
  };

  const isProcessStepsArchived = Boolean(type === ProcessTaskType.Archived);
  const backgroundColor = isProcessStepsArchived
    ? AltinnAppTheme.altinnPalette.primary.greenLight
    : AltinnAppTheme.altinnPalette.primary.greyLight;
  document.body.style.background = backgroundColor;

  return (
    <div className={cn(classes.container, { [classes.expanded]: expandedWidth })}>
      <AltinnAppHeader
        party={party}
        userParty={userParty}
        logoColor={LogoColor.blueDarker}
        headerBackgroundColor={backgroundColor}
      />
      <main className={classes.page}>
        {isProcessStepsArchived && instance?.status?.substatus && (
          <AltinnSubstatusPaper
            label={langAsString(instance.status.substatus.label)}
            description={langAsString(instance.status.substatus.description)}
          />
        )}
        <NavBar
          handleClose={handleModalCloseButton}
          handleBack={handleBackArrowButton}
          showBackArrow={!!previous && (type === ProcessTaskType.Data || type === PresentationType.Stateless)}
        />
        <section
          id='main-content'
          className={classes.modal}
        >
          <Header header={realHeader}>
            <ProgressBar type={type} />
          </Header>
          <div className={classes.modalBody}>{children}</div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

function ProgressBar({ type }: { type: ProcessTaskType | PresentationType }) {
  const showProgressSettings = useAppSelector((state) => state.formLayout.uiConfig.showProgress);
  const enabled = type !== ProcessTaskType.Archived && showProgressSettings;

  if (!enabled) {
    return null;
  }

  return (
    <Grid
      item
      aria-live='polite'
    >
      <Progress />
    </Grid>
  );
}
