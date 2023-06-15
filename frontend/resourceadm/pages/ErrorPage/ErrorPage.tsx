import React from 'react';
import { CenterContainer } from 'resourceadm/components/CenterContainer';

export const ErrorPage = () => {
  return (
    <div>
      <CenterContainer>
        <h1>
          Feil i URL
        </h1>

        <h5>Du har nådd en ugyldig adresse</h5>
        <br></br>

        <p>
          <a href='/'>Gå tilbake til Dashboard</a>
        </p>

      </CenterContainer>
    </div>
  );
};
