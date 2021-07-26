import * as React from 'react';
import SchemaEditor from '@altinn/schema-editor/SchemaEditorApp';
import { IRouteProps } from 'config/routes';
import { DataModelling } from 'app-shared/features';
import { DataModelsMetadataActions } from 'app-shared/features/dataModelling/sagas/metadata';
import { useDispatch } from 'react-redux';
import XSDUploader from '../components/XSDUploader';

interface IDataModellingContainerProps extends IRouteProps {
  language: any;
}

export default function DataModellingContainer(props: IDataModellingContainerProps): JSX.Element {
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
    // Importing the ShcemaEditor inside the app-development project so the alias in webpack works.
    <DataModelling
      language={props.language}
      SchemaEditor={SchemaEditor}
      preferredOptionLabel={preferredOptionLabel}
    >
      <XSDUploader
        language={props.language}
        onXSDUploaded={(filename: string) => onXSDUploaded(filename)}
      />
    </DataModelling>
  );
}
