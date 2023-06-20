import React from 'react';

import { AltinnAppHeader } from 'src/components/altinnAppHeader';
import { ReadyForPrint } from 'src/components/ReadyForPrint';
import { Footer } from 'src/features/footer/Footer';
import classes from 'src/features/instantiate/containers/InstantiationContainer.module.css';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { AltinnAppTheme } from 'src/theme/altinnAppTheme';
import { changeBodyBackground } from 'src/utils/bodyStyling';

export interface IInstantiateContainerProps {
  children?: React.ReactNode;
  type: 'normal' | 'partyChoice';
}

export function InstantiationContainer({ children, type }: IInstantiateContainerProps) {
  changeBodyBackground(AltinnAppTheme.altinnPalette.primary.white);
  const profile = useAppSelector((state) => state.profile.profile);

  return (
    <div className={classes.container}>
      <AltinnAppHeader
        profile={profile}
        type={type}
      />
      <main id='main-content'>{children}</main>
      <Footer />
      <ReadyForPrint />
    </div>
  );
}
