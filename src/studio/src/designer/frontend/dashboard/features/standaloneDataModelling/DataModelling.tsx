import React from 'react';
import { useParams } from 'react-router-dom';
import { DataModelling } from 'app-shared/features';
import { DataModelsMetadataActions } from 'app-shared/features/dataModelling/sagas/metadata';
import { useAppDispatch, useAppSelector } from '../../common/hooks';

export const DataModellingContainer = () => {
  const language = useAppSelector((state) => state.language.language);
  const dispatch = useAppDispatch();
  dispatch(DataModelsMetadataActions.getDataModelsMetadata());
  const { org, repoName } = useParams();
  if (org && repoName) {
    return (
      <div>
        <DataModelling language={language} org={org} repo={repoName} createPathOption />
      </div>
    );
  }
  return <p>Either organization/repository-name was undefined</p>;
};
