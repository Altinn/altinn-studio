import { DataModeling } from '../DataModeling';
import classes from './DataModelingContainer.module.css';
import { dataModelingContainerId } from '@studio/testing/testids';

// Todo: Is this component necessary?
const DataModelingContainer = () => (
  <div className={classes.root} id={dataModelingContainerId} data-testid={dataModelingContainerId}>
    <div className={classes.dataModelingWrapper}>
      <DataModeling />
    </div>
  </div>
);

export default DataModelingContainer;
