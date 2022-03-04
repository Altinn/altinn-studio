import * as React from 'react';
import { IRouteProps } from 'config/routes';
import { DataModelling } from 'app-shared/features';
import { makeStyles, createStyles } from '@material-ui/core';
import { useSelector } from 'react-redux';

interface IDataModellingContainerProps extends IRouteProps {
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
  const { org, repo } = useSelector((state: any) => {
    return {
      org: state.applicationMetadataState.applicationMetadata.org,
      repo: state.serviceInformation.serviceNameObj.name,
    };
  });

  return (
    <div className={classes.root}>
      <DataModelling
        language={language}
        org={org}
        repo={repo}
      />
    </div>
  );
};

export default DataModellingContainer;
