import * as React from 'react';
import { IRouteProps } from 'config/routes';
import { DataModelling } from 'app-shared/features';
import { DataModelsMetadataActions } from 'app-shared/features/dataModelling/sagas/metadata';
import { useDispatch } from 'react-redux';
import { makeStyles, createStyles } from '@material-ui/core';
import XSDUploader from '../components/XSDUploader';

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

export default function DataModellingContainer(props: IDataModellingContainerProps): JSX.Element {
  const classes = useStyles();
  const [preferredOption, setPreferredOption] = React.useState<string>(null);
  const dispatch = useDispatch();
  const onXSDUploaded = (filename: string) => {
    const lowerCaseFileName = filename.toLowerCase();
    const filenameWithoutXsd = lowerCaseFileName.split('.xsd')[0];
    const schemaName = filename.substr(0, filenameWithoutXsd.length);
    setPreferredOption(schemaName);
    dispatch(DataModelsMetadataActions.getDataModelsMetadata());
  };
  const preferredOptionLabel = preferredOption && { label: preferredOption, clear: () => setPreferredOption(null) };
  return (
    <div className={classes.root}>
      <DataModelling
        language={props.language}
        preferredOptionLabel={preferredOptionLabel}
      >
        <XSDUploader
          language={props.language}
          onXSDUploaded={(filename: string) => onXSDUploaded(filename)}
        />
      </DataModelling>
    </div>
  );
}
