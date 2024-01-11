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
import { DevTools } from 'src/features/devtools/DevTools';
import { Footer } from 'src/features/footer/Footer';
import { useUiConfigContext } from 'src/features/form/layout/UiConfigContext';
import { usePageSettings } from 'src/features/form/layoutSettings/LayoutSettingsContext';
import { DataModelFetcher } from 'src/features/formData/FormDataReaders';
import { useLaxInstanceData } from 'src/features/instance/InstanceContext';
import { Lang } from 'src/features/language/Lang';
import { useCurrentParty } from 'src/features/party/PartiesProvider';
import { useProfile } from 'src/features/profile/ProfileProvider';
import { AltinnAppTheme } from 'src/theme/altinnAppTheme';
import { ProcessTaskType } from 'src/types';
import type { PresentationType } from 'src/types';

export interface IPresentationProvidedProps extends PropsWithChildren {
  header?: React.ReactNode;
  type: ProcessTaskType | PresentationType;
  renderNavBar?: boolean;
}

export const PresentationComponent = ({ header, type, children, renderNavBar = true }: IPresentationProvidedProps) => {
  const party = useCurrentParty();
  const instance = useLaxInstanceData();
  const userParty = useProfile()?.party;
  const { expandedWidth } = useUiConfigContext();

  const realHeader = header || (type === ProcessTaskType.Archived ? <Lang id={'receipt.receipt'} /> : undefined);

  const isProcessStepsArchived = Boolean(type === ProcessTaskType.Archived);
  const backgroundColor = isProcessStepsArchived
    ? AltinnAppTheme.altinnPalette.primary.greenLight
    : AltinnAppTheme.altinnPalette.primary.greyLight;
  document.body.style.background = backgroundColor;

  return (
    <DevTools>
      <DataModelFetcher />
      <div
        data-testid='presentation'
        data-expanded={JSON.stringify(expandedWidth)}
        className={cn(classes.container, { [classes.expanded]: expandedWidth })}
      >
        <AltinnAppHeader
          party={party}
          userParty={userParty}
          logoColor={LogoColor.blueDarker}
          headerBackgroundColor={backgroundColor}
        />
        <main className={classes.page}>
          {isProcessStepsArchived && instance?.status?.substatus && (
            <AltinnSubstatusPaper
              label={<Lang id={instance.status.substatus.label} />}
              description={<Lang id={instance.status.substatus.description} />}
            />
          )}
          {renderNavBar && <NavBar type={type} />}
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
    </DevTools>
  );
};

function ProgressBar({ type }: { type: ProcessTaskType | PresentationType }) {
  const { showProgress } = usePageSettings();
  const enabled = type !== ProcessTaskType.Archived && showProgress;

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
