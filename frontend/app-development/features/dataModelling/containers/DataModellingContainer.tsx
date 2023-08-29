import React from 'react';
import { DataModelling } from '../DataModelling';
import classes from './DataModellingContainer.module.css';
import * as testids from '../../../../testing/testids';

// Todo: Is this component necessary?
const DataModellingContainer = () => (
  <div
    className={classes.root}
    id={testids.dataModellingContainer}
    data-testid={testids.dataModellingContainer}
  >
    <div className={classes.dataModellingWrapper}>
      <DataModelling/>
    </div>
  </div>
);

export default DataModellingContainer;
