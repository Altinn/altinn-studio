import * as React from 'react';
import { RouteChildrenProps, useParams } from 'react-router-dom';
import { DataModelling } from 'app-shared/features';
import { connect } from 'react-redux';
import { DataModelsMetadataActions } from 'app-shared/features/dataModelling/sagas/metadata';
import { createStyles, Grid, withStyles } from '@material-ui/core';
import { useAppDispatch } from 'common/hooks';

type IStandaloneDataModellingProps = Partial<RouteChildrenProps> & {
  language: any;
  classes: any;
}

interface IOrgRepoType {
  org: string;
  repoName: string;
}

const styles = createStyles({
  containerGrid: {
    marginTop: 70,
  },
});

const DataModellingContainer = ({ classes, language }: IStandaloneDataModellingProps) => {
  const dispatch = useAppDispatch();
  dispatch(DataModelsMetadataActions.getDataModelsMetadata());

  const { org, repoName } = useParams() as IOrgRepoType;

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
const standaloneDataModelling = connect(mapStateToProps)(
  DataModellingContainer,
);
export default withStyles(styles)(standaloneDataModelling);
