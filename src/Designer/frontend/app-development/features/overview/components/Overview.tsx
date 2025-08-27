import React from 'react';
import classes from './Overview.module.css';
import { Link } from '@digdir/designsystemet-react';
import { useTranslation } from 'react-i18next';
import { Documentation } from './Documentation';
import { Navigation } from './Navigation';
import { News } from './News';
import { Deployments } from './Deployments';
import { Header } from './Header';
import { StudioPageImageBackgroundContainer } from 'libs/studio-components-legacy/src';

export const Overview = () => {
  const { t } = useTranslation();

  return (
    <StudioPageImageBackgroundContainer image='/designer/img/page-background.svg'>
      <main className={classes.container}>
        {/* According to https://developer.mozilla.org/en-US/docs/Web/HTML/Element/header, the role of <header> should implicitly be "generic" when it is a descendant of <main>, but Testing Library still interprets it as "banner". */}
        <header className={classes.header} role='generic'>
          <Header />
        </header>
        <div className={classes.panel}>
          <div className={classes.content}>
            <div className={classes.main}>
              <Deployments className={classes.mainSection} />
              <section className={classes.mainSection}>
                <Navigation />
              </section>
            </div>
            <aside className={classes.aside}>
              <section className={classes.asideSection}>
                <Documentation />
              </section>
              <section>
                <News />
              </section>
            </aside>
          </div>
          <footer className={classes.footer}>
            <Link href='/info/contact'>{t('general.contact')}</Link>
          </footer>
        </div>
      </main>
    </StudioPageImageBackgroundContainer>
  );
};
