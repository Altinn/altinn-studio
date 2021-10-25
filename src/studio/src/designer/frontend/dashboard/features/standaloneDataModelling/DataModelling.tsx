import * as React from 'react';
import { RouteChildrenProps, useParams } from 'react-router-dom';
import { DataModelling } from 'app-shared/features';
import { connect, useDispatch } from 'react-redux';
import { DataModelsMetadataActions } from 'app-shared/features/dataModelling/sagas/metadata';
import { createStyles, Grid, withStyles } from '@material-ui/core';

type IStandaloneDataModellingProps = Partial<RouteChildrenProps> & {
  language: any;
  classes: any;
}

const styles = createStyles({
  containerGrid: {
    marginTop: 70,
  },
});

type orgRepoType = {
  org: string;
  repoName: string;
}

const DataModellingContainer = ({ classes, language }: IStandaloneDataModellingProps) => {
  const dispatch = useDispatch();
  dispatch(DataModelsMetadataActions.getDataModelsMetadata());

  const { org, repoName } = useParams() as orgRepoType;

  return (
    <Grid item className={classes.containerGrid}>
      <DataModelling
        language={language}
        org={org}
        repo={repoName}
        createPathOption
      />
    </Grid>
  );
};

const mapStateToProps = (
  state: IDashboardAppState,
  props: IStandaloneDataModellingProps,
) => {
  return {
    classes: props.classes,
    language: state.language.language,
  };
};
const standaloneDataModelling = connect(mapStateToProps)(DataModellingContainer);
export default withStyles(styles)(standaloneDataModelling);
