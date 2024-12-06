import React from 'react';
import { DataModelling } from '../DataModelling';
import classes from './DataModellingContainer.module.css';
import { dataModellingContainerId } from '@studio/testing/testids';

// Todo: Is this component necessary?
const DataModellingContainer = () => (
  <div
    className={classes.root}
    id={dataModellingContainerId}
    data-testid={dataModellingContainerId}
  >
    <div className={classes.dataModellingWrapper}>
      <DataModelling />
    </div>
  </div>
);

export default DataModellingContainer;
