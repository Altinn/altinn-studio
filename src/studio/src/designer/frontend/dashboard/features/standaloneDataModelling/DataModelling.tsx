import * as React from 'react';
import { DataModelling } from 'app-shared/features';
import { connect, useDispatch } from 'react-redux';
import { DataModelsMetadataActions } from 'app-shared/features/dataModelling/sagas/metadata';
import { createStyles, Grid, withStyles } from '@material-ui/core';

interface IStandaloneDataModellingProps {
  language: any;
  classes: any;
}
const styles = createStyles({
  containerGrid: {
    marginTop: 70,
  },
});
function DataModellingContainer(props: IStandaloneDataModellingProps): JSX.Element {
  const dispatch = useDispatch();
  dispatch(DataModelsMetadataActions.getDataModelsMetadata());
  return (
    <Grid item className={props.classes.containerGrid}>
      <DataModelling language={props.language} createPathOption />
    </Grid>
  );
}

const mapStateToProps = (
  state: IDashboardAppState,
  props: IStandaloneDataModellingProps,
): IStandaloneDataModellingProps => {
  return {
    classes: props.classes,
    language: state.language.language,
  };
};
const standaloneDataModelling = connect(mapStateToProps)(DataModellingContainer);
export default withStyles(styles)(standaloneDataModelling);
