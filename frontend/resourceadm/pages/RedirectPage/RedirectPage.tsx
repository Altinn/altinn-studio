import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { CenterContainer } from 'resourceadm/components/CenterContainer';
import classes from './RedirectPage.module.css';

export const RedirectPage = () => {
  const { selectedContext } = useParams();

  // warning page if user has chosen "Alle"
  let orgIsAlle: boolean = false;
  if (selectedContext === 'all') orgIsAlle = true;

  return (
    <div className={classes.pageWrapper}>
      {orgIsAlle ? (
        <CenterContainer>
          <h1>Du har en ugyldig URL</h1>
          <br></br>
          <p>Merk! URL = /resourceadm/all/ er ikke gyldig : du må velge en enkelt organisasjon</p>
          <br></br>
          <p>
            <a href='/'>Gå tilbake til Dashboard</a>
          </p>
        </CenterContainer>
      ) : (
        <Navigate to={`${selectedContext}-resources/`} replace={true} />
      )}
    </div>
  );
};
