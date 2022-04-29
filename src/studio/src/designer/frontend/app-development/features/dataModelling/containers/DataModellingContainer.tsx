import React from 'react';
import { DataModelling } from 'app-shared/features';
import { makeStyles, createStyles } from '@material-ui/core';
import { useAppSelector } from 'common/hooks';

interface IDataModellingContainerProps {
  language: any;
}

const useStyles = makeStyles(
  createStyles({
    root: {
      marginLeft: 80,
      width: 'calc(100% - 80px)',
      display: 'inline-flex',
    },
  }),
);

const DataModellingContainer = ({ language }: IDataModellingContainerProps) => {
  const classes = useStyles();
  const repo = useAppSelector(
    (state) => state.serviceInformation.serviceNameObj.name,
  );
  const org = useAppSelector(
    (state) => state.applicationMetadataState.applicationMetadata.org,
  );

  return (
    <div className={classes.root}>
      <DataModelling language={language} org={org} repo={repo} />
    </div>
  );
};

export default DataModellingContainer;
