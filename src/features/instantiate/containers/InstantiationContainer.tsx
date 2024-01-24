import React from 'react';

import { AltinnAppHeader } from 'src/components/altinnAppHeader';
import { ReadyForPrint } from 'src/components/ReadyForPrint';
import { RenderStart } from 'src/core/ui/RenderStart';
import { Footer } from 'src/features/footer/Footer';
import classes from 'src/features/instantiate/containers/InstantiationContainer.module.css';
import { useProfile } from 'src/features/profile/ProfileProvider';
import { AltinnAppTheme } from 'src/theme/altinnAppTheme';
import { changeBodyBackground } from 'src/utils/bodyStyling';

export interface IInstantiateContainerProps {
  children?: React.ReactNode;
}

export function InstantiationContainer({ children }: IInstantiateContainerProps) {
  changeBodyBackground(AltinnAppTheme.altinnPalette.primary.white);
  const profile = useProfile();

  return (
    <RenderStart>
      <div className={classes.container}>
        <AltinnAppHeader profile={profile} />
        <main id='main-content'>{children}</main>
        <Footer />
        <ReadyForPrint />
      </div>
    </RenderStart>
  );
}
