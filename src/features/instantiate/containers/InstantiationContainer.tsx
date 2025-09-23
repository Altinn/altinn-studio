import React from 'react';

import { ReadyForPrint } from 'src/components/ReadyForPrint';
import { RenderStart } from 'src/core/ui/RenderStart';
import { Footer } from 'src/features/footer/Footer';
import classes from 'src/features/instantiate/containers/InstantiationContainer.module.css';
import { InstantiateHeader } from 'src/features/instantiate/instantiateHeader/InstantiateHeader';
import { useProfile } from 'src/features/profile/ProfileProvider';
import { AltinnPalette } from 'src/theme/altinnAppTheme';
import { changeBodyBackground } from 'src/utils/bodyStyling';

export interface IInstantiateContainerProps {
  children?: React.ReactNode;
}

export function InstantiationContainer({ children }: IInstantiateContainerProps) {
  changeBodyBackground(AltinnPalette.white);
  const profile = useProfile();

  return (
    <RenderStart>
      <div className={classes.container}>
        <InstantiateHeader profile={profile} />
        <main id='main-content'>{children}</main>
        <Footer />
        <ReadyForPrint type='load' />
      </div>
    </RenderStart>
  );
}
