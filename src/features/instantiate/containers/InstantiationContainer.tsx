import React from 'react';

import { useAppSelector } from 'src/common/hooks/useAppSelector';
import { Footer } from 'src/features/footer/Footer';
import classes from 'src/features/instantiate/containers/InstantiationContainer.module.css';
import { AltinnAppHeader } from 'src/shared/components/altinnAppHeader';
import { ReadyForPrint } from 'src/shared/components/ReadyForPrint';
import { AltinnAppTheme } from 'src/theme/altinnAppTheme';
import { changeBodyBackground } from 'src/utils/bodyStyling';

export interface IInstantiateContainerProps {
  children?: React.ReactNode;
  type: 'normal' | 'partyChoice';
}

export function InstantiationContainer({ children, type }: IInstantiateContainerProps) {
  changeBodyBackground(AltinnAppTheme.altinnPalette.primary.white);
  const language = useAppSelector((state) => state.language.language);
  const profile = useAppSelector((state) => state.profile.profile);

  if (!language) {
    return null;
  }

  return (
    <div className={classes.container}>
      <AltinnAppHeader
        language={language}
        profile={profile}
        type={type}
      />
      <main id='main-content'>{children}</main>
      <Footer />
      <ReadyForPrint />
    </div>
  );
}
