import React from 'react';
import { CenterContainer } from 'resourceadm/components/CenterContainer';
import classes from './ErrorPage.module.css';
import { Footer } from 'resourceadm/components/Footer';

export const ErrorPage = () => {
  return (
    <>
      <div className={classes.pageWrapper}>
        <CenterContainer>
          <h2>
            Feil i URL
          </h2>

          <br></br>
          <h3>Du har nådd en ugyldig adresse</h3>
          <br></br>

          <p>
            <a href='/'>Gå tilbake til Dashboard</a>
          </p>
        </CenterContainer>
      </div>
      <Footer />
    </>
  );
};
