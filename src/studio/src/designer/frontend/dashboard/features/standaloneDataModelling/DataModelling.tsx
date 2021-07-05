import * as React from 'react';
import SchemaEditor from '@altinn/schema-editor/SchemaEditorApp';
import { DataModelling } from 'app-shared/features';
import { useDispatch } from 'react-redux';
import { DataModelsMetadataActions } from 'app-shared/features/dataModelling/sagas/metadata';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import { createStyles, Grid, withStyles } from '@material-ui/core';

interface IStandaloneDataModellingProps extends RouteComponentProps {
  language: any;
  classes: any;
}
const styles = createStyles({
  containerGrid: {
    marginLeft: 50,
    marginRight: 50,
    marginTop: 70,
  },
});
function DataModellingContainer(props: IStandaloneDataModellingProps): JSX.Element {
  const dispatch = useDispatch();
  dispatch(DataModelsMetadataActions.getDataModelsMetadata());
  return (
    // Importing the ShcemaEditor inside the dashboard-development project so the alias in webpack works.
    <Grid item className={props.classes.containerGrid}>
      <DataModelling language={props.language} SchemaEditor={SchemaEditor} />
    </Grid>
  );
}
export default withRouter(withStyles(styles)(DataModellingContainer));
