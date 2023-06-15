import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { CenterContainer } from 'resourceadm/components/CenterContainer';

export const RedirectPage = () => {
  const { selectedContext } = useParams();

  // gir advarsel-side om bruker har valgt "Alle"
  let orgErAlle : boolean = false;
  if (selectedContext === 'all') orgErAlle = true;

  // Fixme: burde bruke template string for å bygge URL:
  //  på mønster olsenbanden/olsenbanden-resources
  // const redirectPath: string = `${selectedContext}-resources/`;

  return (
    <div>
      { orgErAlle && (
        <CenterContainer>
          <h1>Du har en ufullstendig URL med Alle</h1>

          <h5>Merk! URL = /resourceadm/all/ er ikke gyldig : du må velge en enkelt organisasjon</h5>

          <p>
            < a href='/'>Gå tilbake til Dashboard</a>
          </p>

      </CenterContainer>
      )
    }
    { !orgErAlle && (
      <Navigate to={`${selectedContext}-resources/`} replace={true} />
    )}
    </div>
  );
};
