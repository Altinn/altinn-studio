import React from 'react';
import { DataModelling } from 'app-shared/features';
import classes from './DataModellingContainer.module.css';

// Todo: Is this component necessary?
const DataModellingContainer = () => (
  <div
    className={classes.root}
    id='data-modelling-container'
    data-testid='data-modelling-container'
  >
    <div className={classes.dataModellingWrapper}>
      <DataModelling/>
    </div>
  </div>
);

export default DataModellingContainer;
