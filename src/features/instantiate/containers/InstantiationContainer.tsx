import React from 'react';

import { AltinnAppHeader } from 'src/components/altinnAppHeader';
import { ReadyForPrint } from 'src/components/ReadyForPrint';
import { Footer } from 'src/features/footer/Footer';
import classes from 'src/features/instantiate/containers/InstantiationContainer.module.css';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { getLanguageFromCode } from 'src/language/languages';
import { AltinnAppTheme } from 'src/theme/altinnAppTheme';
import { changeBodyBackground } from 'src/utils/bodyStyling';

const defaultLocale = 'nb';
export interface IInstantiateContainerProps {
  children?: React.ReactNode;
  type: 'normal' | 'partyChoice';
}

export function InstantiationContainer({ children, type }: IInstantiateContainerProps) {
  changeBodyBackground(AltinnAppTheme.altinnPalette.primary.white);
  const fetchedLanguage = useAppSelector((state) => state.language.language);
  const languageFromCode = getLanguageFromCode(defaultLocale);

  // Fallback to default language if fetched language has failed fetching
  const language = fetchedLanguage || languageFromCode;
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
