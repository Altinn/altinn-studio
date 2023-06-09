import React, { useState } from 'react';
import classes from './DeployResourcePage.module.css';
import { ResourceDeployStatus } from 'resourceadm/components/ResourceDeployStatus';
import { useOnce } from 'resourceadm/hooks/useOnce';

export const DeployResourcePage = () => {
  // To manage state for when the page is loading if it is valid
  const [isValidatingResource, setIsValidatingResource] = useState(false);

  // To manage state for if the resource is valid or not
  const [resourceIsValid, setResourceIsValid] = useState(true);

  useOnce(() => {
    // TODO - API call to backend to get validation
  });

  return (
    <div className={classes.deployPageWrapper}>
      <h1 className={classes.pageHeader}>Publiser ressurs</h1>
      <ResourceDeployStatus
        type={resourceIsValid ? 'success' : 'alert'}
        message={
          resourceIsValid
            ? 'Ingen feil i ressursen. Du kan publisere den.'
            : 'Det er feil i ressursen - TODO - LIST ALL'
        }
      />
      <div>
        <h2 className={classes.subHeader}>Velg miljø å publisere i</h2>
        <div>TODO - Test miljø</div>
        <div>TODO - Prod miljø</div>
      </div>
    </div>
  );
};
