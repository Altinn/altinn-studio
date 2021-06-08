import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import SchemaEditorApp from '@altinn/schema-editor/SchemaEditorApp';
import { Button, createStyles, Grid, makeStyles } from '@material-ui/core';
import { AddCircleOutline, DeleteOutline } from '@material-ui/icons';
import AltinnPopover from 'app-shared/components/AltinnPopover';
import AltinnPopoverSimple from 'app-shared/components/molecules/AltinnPopoverSimple';
import AltinnInputField from 'app-shared/components/AltinnInputField';
import { getLanguageFromKey, getParsedLanguageFromKey } from 'app-shared/utils/language';
import { SchemaSelect } from '../schemaSelect';
import { deleteDataModel, fetchDataModel, createNewDataModel, saveDataModel, setDataModelName } from '../dataModelingSlice';

function getDataModelTypeName(applicationMetadata: any) {
  if (!applicationMetadata || !applicationMetadata.dataTypes) return undefined;
  const dataTypeWithLogic = applicationMetadata.dataTypes.find((dataType: any) => dataType.appLogic);
  return dataTypeWithLogic?.id;
}

const useStyles = makeStyles(
  createStyles({
    root: {
      marginTop: 24,
      marginLeft: 80,
    },
    schema: {
      marginTop: 4,
    },
    button: {
      margin: 4,
    },
  }),
);

export interface IDataModelingContainerProps {
  language: any;
}

export default function DataModelingContainer(props: IDataModelingContainerProps): JSX.Element {
  const classes = useStyles();
  const dispatch = useDispatch();
  const jsonSchema = useSelector((state: IServiceDevelopmentState) => state.dataModeling.schema);
  const dataModelName = useSelector(
    (state: IServiceDevelopmentState) => getDataModelTypeName(state.applicationMetadataState.applicationMetadata),
  );
  const selectedDataModelName = useSelector((state: IServiceDevelopmentState) => state.dataModeling.modelName);
  const fetchModel = (name: string) => {
    dispatch(setDataModelName({ modelName: name }));
    dispatch(fetchDataModel({}));
  };
  const [deleteButtonAnchor, setDeleteButtonAnchor] = React.useState(null);
  const [createButtonAnchor, setCreateButtonAnchor] = React.useState(null);
  const [newModelName, setNewModelName] = React.useState(null);

  React.useEffect(() => {
    if (dataModelName) {
      fetchModel(dataModelName);
    }
  }, [dispatch, dataModelName]);

  const onSchemaSelected = (id: string, schema: any) => {
    fetchModel(schema.id);
  };
  const onSaveSchema = (schema: any) => {
    dispatch(saveDataModel({ schema }));
  };
  const onCreateClick = (event: any) => {
    setCreateButtonAnchor(event.currentTarget);
  };
  const onNewModelNameChanged = (e: any) => {
    setNewModelName(e.target.value);
  };
  const onCreateConfirmClick = () => {
    if (newModelName && newModelName.length > 0) {
      dispatch(createNewDataModel({ modelName: newModelName }));
    }
    setCreateButtonAnchor(null);
    setNewModelName(null);
  };
  const onDeleteClick = (event: any) => {
    setDeleteButtonAnchor(event.currentTarget);
  };
  const onDeleteConfirmClick = () => {
    dispatch(deleteDataModel());
    setDeleteButtonAnchor(null);
  };
  const onCancelDelete = () => {
    setDeleteButtonAnchor(null);
  };
  const onCancelCreate = () => {
    setCreateButtonAnchor(null);
    setNewModelName(null);
  };

  return (
    <div className={classes.root}>
      <Grid container>
        <Grid item>
          <Button
            id='new-button'
            variant='contained'
            className={classes.button}
            startIcon={<AddCircleOutline />}
            onClick={onCreateClick}
          >
            {getLanguageFromKey('general.create_new', props.language)}
          </Button>
        </Grid>
        <Grid item xs={4}>
          <SchemaSelect
            id='schema' value={selectedDataModelName}
            onChange={onSchemaSelected}
          />
        </Grid>
        <Grid item>
          <Button
            id='delete-button'
            variant='contained'
            className={classes.button}
            startIcon={<DeleteOutline />}
            onClick={onDeleteClick}
          >
            {getLanguageFromKey('general.delete', props.language)}
          </Button>
        </Grid>
        <AltinnPopover
          anchorEl={deleteButtonAnchor}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          btnCancelText={getLanguageFromKey('general.cancel', props.language)}
          descriptionText={getParsedLanguageFromKey('administration.delete_model_confirm', props.language, [selectedDataModelName], true)}
          btnConfirmText={getLanguageFromKey('general.continue', props.language)}
          btnPrimaryId='confirm-delete-button'
          btnClick={onDeleteConfirmClick}
          handleClose={onCancelDelete}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        />
        <AltinnPopoverSimple
          anchorEl={createButtonAnchor}
          handleClose={onCancelCreate}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
        >
          <AltinnInputField
            id='newModelInput'
            placeholder='Name'
            btnText='Ok'
            inputFieldStyling={{ width: '250px' }}
            onChangeFunction={onNewModelNameChanged}
            onBtnClickFunction={onCreateConfirmClick}
          />

        </AltinnPopoverSimple>
      </Grid>
      { selectedDataModelName ?
        <SchemaEditorApp
          language={props.language}
          schema={jsonSchema}
          onSaveSchema={onSaveSchema}
          rootItemId={`#/definitions/${selectedDataModelName}`}
        /> : null}
    </div>
  );
}
