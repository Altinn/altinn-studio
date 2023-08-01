import React from 'react';
import { CenterContainer } from 'resourceadm/components/CenterContainer';
import classes from './ErrorPage.module.css';

export const ErrorPage = () => {
  return (
    <div className={classes.pageWrapper}>
      <CenterContainer>
        <h1>Feil i URL</h1>
        <br></br>
        <h2>Du har nådd en ugyldig adresse</h2>
        <br></br>
        <p>
          <a href='/'>Gå tilbake til Dashboard</a>
        </p>
      </CenterContainer>
    </div>
  );
};
