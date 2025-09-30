import React, { useLayoutEffect } from 'react';
import type { PropsWithChildren } from 'react';

import cn from 'classnames';

import { Flex } from 'src/app-components/Flex/Flex';
import { LogoColor } from 'src/components/logo/AltinnLogo';
import { AltinnSubstatus } from 'src/components/molecules/AltinnSubstatus';
import { AppHeader } from 'src/components/presentation/AppHeader/AppHeader';
import { Header } from 'src/components/presentation/Header';
import { NavBar } from 'src/components/presentation/NavBar';
import classes from 'src/components/presentation/Presentation.module.css';
import { Progress } from 'src/components/presentation/Progress';
import { createContext } from 'src/core/contexts/context';
import { RenderStart } from 'src/core/ui/RenderStart';
import { Footer } from 'src/features/footer/Footer';
import { useUiConfigContext } from 'src/features/form/layout/UiConfigContext';
import { usePageSettings } from 'src/features/form/layoutSettings/LayoutSettingsContext';
import { useInstanceDataQuery } from 'src/features/instance/InstanceContext';
import { Lang } from 'src/features/language/Lang';
import { SideBarNavigation } from 'src/features/navigation/SidebarNavigation';
import { useHasGroupedNavigation } from 'src/features/navigation/utils';
import { AltinnPalette } from 'src/theme/altinnAppTheme';
import { ProcessTaskType } from 'src/types';
import type { PresentationType } from 'src/types';

export interface IPresentationProvidedProps extends PropsWithChildren {
  header?: React.ReactNode;
  type: ProcessTaskType | PresentationType;
  showNavbar?: boolean;
  showNavigation?: boolean;
}

export const PresentationComponent = ({
  header,
  type,
  children,
  showNavbar = true,
  showNavigation = true,
}: IPresentationProvidedProps) => {
  const instanceStatus = useInstanceDataQuery({
    select: (instance) => instance.status,
  }).data;
  const { expandedWidth } = useUiConfigContext();
  const hasGroupedNavigation = useHasGroupedNavigation();

  const realHeader = header || (type === ProcessTaskType.Archived ? <Lang id='receipt.receipt' /> : undefined);

  const isProcessStepsArchived = Boolean(type === ProcessTaskType.Archived);
  const backgroundColor = isProcessStepsArchived ? AltinnPalette.greenLight : AltinnPalette.greyLight;

  useLayoutEffect(() => {
    document.body.style.background = backgroundColor;
  }, [backgroundColor]);

  return (
    <RenderStart>
      <PresentationProvider value={undefined}>
        <div
          data-testid='presentation'
          data-expanded={JSON.stringify(expandedWidth)}
          className={cn(classes.container, {
            [classes.withNavigation]: hasGroupedNavigation,
            [classes.expanded]: expandedWidth,
          })}
        >
          <AppHeader
            logoColor={LogoColor.blueDarker}
            headerBackgroundColor={backgroundColor}
          />
          {showNavbar && <NavBar showNavigation={showNavigation} />}
          {showNavigation && <SideBarNavigation />}
          <main
            className={classes.page}
            style={!showNavbar ? { marginTop: 54 } : undefined}
          >
            {isProcessStepsArchived && instanceStatus?.substatus && (
              <AltinnSubstatus
                label={<Lang id={instanceStatus.substatus.label} />}
                description={<Lang id={instanceStatus.substatus.description} />}
              />
            )}
            <section
              id='main-content'
              className={classes.modal}
              tabIndex={-1}
            >
              <Header header={realHeader}>
                <ProgressBar type={type} />
              </Header>
              <div className={classes.modalBody}>{children}</div>
            </section>
          </main>
          <Footer />
        </div>
      </PresentationProvider>
    </RenderStart>
  );
};

function ProgressBar({ type }: { type: ProcessTaskType | PresentationType }) {
  const { showProgress } = usePageSettings();
  const enabled = type !== ProcessTaskType.Archived && showProgress;

  if (!enabled) {
    return null;
  }

  return (
    <Flex
      item
      aria-live='polite'
    >
      <Progress />
    </Flex>
  );
}

const { Provider: PresentationProvider, useHasProvider } = createContext<undefined>({
  name: 'Presentation',
  required: true,
});

export const useHasPresentation = () => useHasProvider();

/**
 * The loader component will check if a presentation component already exists,
 * and if so, will not create one. In cases where we don't want to show any presentation
 * for loaders, this can be used to prevent the loader from creating a presentation.
 */
export function DummyPresentation({ children }: PropsWithChildren) {
  return <PresentationProvider value={undefined}>{children}</PresentationProvider>;
}
