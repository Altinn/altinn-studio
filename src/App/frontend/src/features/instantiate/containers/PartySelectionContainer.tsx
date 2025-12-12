import React from 'react';

import { getUserProfile } from 'nextsrc/nexttanstack/domain/User/getUserProfile';

import { ReadyForPrint } from 'src/components/ReadyForPrint';
import { RenderStart } from 'src/core/ui/RenderStart';
import { Footer } from 'src/features/footer/Footer';
import classes from 'src/features/instantiate/containers/InstantiationContainer.module.css';
import { PartySelectionHeader } from 'src/features/instantiate/instantiateHeader/PartySelectionHeader';
import { AltinnPalette } from 'src/theme/altinnAppTheme';
import { changeBodyBackground } from 'src/utils/bodyStyling';

export interface IInstantiateContainerProps {
  children?: React.ReactNode;
}

export function PartySelectionContainer({ children }: IInstantiateContainerProps) {
  changeBodyBackground(AltinnPalette.white);
  const profile = getUserProfile();

  return (
    <RenderStart>
      <div className={classes.container}>
        <PartySelectionHeader profile={profile} />
        <main id='main-content'>{children}</main>
        <Footer />
        <ReadyForPrint type='load' />
      </div>
    </RenderStart>
  );
}
