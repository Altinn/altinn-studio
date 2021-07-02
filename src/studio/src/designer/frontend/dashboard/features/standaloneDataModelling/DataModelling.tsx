import * as React from 'react';
import SchemaEditor from '@altinn/schema-editor/SchemaEditorApp';
import { DataModelling } from 'app-shared/features';
import { useDispatch } from 'react-redux';
import { DataModelsMetadataActions } from 'app-shared/features/dataModelling/sagas/metadata';
import { RouteComponentProps } from 'react-router-dom';

interface IStandaloneDataModellingProps extends RouteComponentProps {
  language: any;
}

export default function DataModellingContainer(props: IStandaloneDataModellingProps): JSX.Element {
  const { org, repoName } = props.match.params as any;
  const subPath = Object.values(props.match.params)[0];
  const dispatch = useDispatch();
  dispatch(DataModelsMetadataActions.getDataModelsMetadata());
  if (!props.language) {
    return (
      <code>
        <br />
        <br />
        <br />
        <br />
        <pre>
          <br />
          a
          {JSON.stringify(props, null, ' ')}
          <br />
          b
          {JSON.stringify(subPath, null, ' ')}
          <br />
          c
          {JSON.stringify([org, repoName], null, ' ')}
        </pre>
      </code>
    );
  }
  return (
    // Importing the ShcemaEditor inside the dashboard-development project so the alias in webpack works.
    <DataModelling language={props.language} SchemaEditor={SchemaEditor} />
  );
}
