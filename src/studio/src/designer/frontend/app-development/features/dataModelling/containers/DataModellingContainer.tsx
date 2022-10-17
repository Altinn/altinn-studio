import React from 'react';
import { DataModelling } from 'app-shared/features';
import VersionControlHeader from 'app-shared/version-control/versionControlHeader';
import { makeStyles, createStyles, Grid } from '@material-ui/core';
import { useAppSelector } from 'common/hooks';

interface IDataModellingContainerProps {
  language: any;
}

const useStyles = makeStyles(
  createStyles({
    root: {
      marginLeft: 80,
      width: 'calc(100% - 80px)',
      display: 'flex',
    },
    versionControlHeaderMargin: {
      marginBottom: 12,
    },
  }),
);

const DataModellingContainer = ({ language }: IDataModellingContainerProps) => {
  const classes = useStyles();

  const [org, repo] = useAppSelector((state) => {
    const id = state.applicationMetadataState.applicationMetadata.id;
    return id?.split('/') || [];
  })

  return (
    <Grid container className={classes.root}>
      <Grid item xs={12} className={classes.versionControlHeaderMargin}>
        <VersionControlHeader language={language}/>
      </Grid>
      <Grid item xs={12}>
        <DataModelling language={language} org={org} repo={repo} />
      </Grid>
    </Grid>
  );
};

export default DataModellingContainer;
