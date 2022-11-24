import React from 'react';
import { DataModelling } from 'app-shared/features';
import classes from './DataModellingContainer.module.css';
import { useParams } from 'react-router-dom';

interface IDataModellingContainerProps {
  language: any;
}

const DataModellingContainer = ({ language }: IDataModellingContainerProps) => {
  const {org, app} = useParams();

  return (
    <div className={classes.root} id='data-modelling-container' data-testid='data-modelling-container'>
      <div className={classes.dataModellingWrapper}>
        <DataModelling
          language={language}
          org={org}
          repo={app}
        />
      </div>
    </div>
  );
};

export default DataModellingContainer;
