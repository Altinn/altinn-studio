import React from 'react';
import { DataModelling } from 'app-shared/features';
import VersionControlHeader from 'app-shared/version-control/versionControlHeader';
import { useAppSelector } from 'common/hooks';
import classes from './DataModellingContainer.module.css'

interface IDataModellingContainerProps {
  language: any;
}

const DataModellingContainer = ({ language }: IDataModellingContainerProps) => {
  const [org, repo] = useAppSelector((state) => {
    const id = state.applicationMetadataState.applicationMetadata.id;
    return id?.split('/') || [];
  });

  return (
    <div className={classes.root}>
      <VersionControlHeader language={language}/>
      <div className={classes.dataModellingWrapper}>
        <DataModelling language={language} org={org} repo={repo} />
      </div>
    </div>
  );
};

export default DataModellingContainer;
