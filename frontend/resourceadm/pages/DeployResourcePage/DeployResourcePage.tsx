import React, { useState } from 'react';
import classes from './DeployResourcePage.module.css';

export const DeployResourcePage = () => {
  // To manage state for when the page is loading if it is valid
  const [isValidatingResource, setIsValidatingResource] = useState(false);

  // To manage state for if the resource is valid or not
  const [resourceIsValid, setResourceIsValid] = useState(false);

  return (
    <div className={classes.deployPageWrapper}>
      <h1 className={classes.pageHeader}>Publiser ressurs</h1>
      <div>TODO - Valideringsstatus</div>
      <div>
        <h2 className={classes.subHeader}>Velg miljø å publisere i</h2>
        <div>TODO - Test miljø</div>
        <div>TODO - Prod miljø</div>
      </div>
    </div>
  );
};
