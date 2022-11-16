import React, { useEffect, useState } from 'react';
import { Grid } from '@mui/material';
import { AltinnColumnLayout } from 'app-shared/components/AltinnColumnLayout';
import AltinnSpinner from 'app-shared/components/AltinnSpinner';
import { getLanguageFromKey } from 'app-shared/utils/language';
import { HandleServiceInformationActions } from '../handleServiceInformationSlice';
import { MainContent } from './MainContent';
import { SideMenuContent } from './SideMenuContent';
import { useParams } from 'react-router-dom';
import classes from './Administration.module.css';
import { useAppDispatch, useAppSelector } from '../../../common/hooks';

export function AdministrationComponent() {
  const name = useAppSelector((state) => state.serviceInformation.serviceNameObj.name);
  const description = useAppSelector((state) => state.serviceInformation.serviceDescriptionObj.description);
  const id = useAppSelector((state) => state.serviceInformation.serviceIdObj.serviceId);
  const language = useAppSelector((state) => state.languageState.language);
  const repository = useAppSelector((state) => state.serviceInformation.repositoryInfo);
  const initialCommit = useAppSelector((state) => state.serviceInformation.initialCommit);
  const dispatch = useAppDispatch();

  const [newName, setNewName] = useState<string>(name);
  const [newDescription, setNewDescription] = useState<string>(description);
  const [newId, setNewId] = useState<string>(id);
  const [editAppName, setEditAppName] = useState<boolean>();
  const [editAppDescription, setEditAppDescription] = useState<boolean>();
  const [editAppId, setEditAppId] = useState<boolean>();
  const [appNameAnchorEl, setAppNameAnchorEl] = useState<HTMLElement>();

  useEffect(() => {
    setNewName(name);
  }, [name]);

  useEffect(() => {
    setNewDescription(description);
  }, [description]);

  useEffect(() => {
    setNewId(id);
  }, [id]);

  const handleAppNameChange = (event: any) => {
    setNewName(event.target.value);
    setAppNameAnchorEl(null);
  };

  const handleEditAppNameClick = () => {
    setEditAppName(true);
  };

  const handleAppNameBlur = () => {
    if (editAppName && !newName) {
      setAppNameAnchorEl(document.getElementById('administrationInputAppName'));
    } else {
      dispatch(
        HandleServiceInformationActions.saveServiceName({
          url: `${window.location.origin}/designer/${org}/${app}/Text/SetServiceName`,
          newServiceName: newName,
        }),
      );
      dispatch(
        HandleServiceInformationActions.saveServiceConfig({
          url: `${window.location.origin}/designer/${org}/${app}/Config/SetServiceConfig`,
          newServiceDescription: newDescription,
          newServiceId: newId,
          newServiceName: newName,
        }),
      );
      setEditAppName(false);
    }
  };

  const handleAppDescriptionChange = (event: any) => {
    setNewDescription(event.target.value);
    setEditAppDescription(true);
  };
  const { org, app } = useParams();
  const handleAppDescriptionBlur = () => {
    if (editAppDescription) {
      dispatch(
        HandleServiceInformationActions.saveServiceConfig({
          url: `${window.location.origin}/designer/${org}/${app}/Config/SetServiceConfig`,
          newServiceDescription: newDescription,
          newServiceId: newId,
          newServiceName: newName,
        }),
      );
      setEditAppDescription(false);
    }
  };

  const handleAppIdChange = (event: any) => {
    setNewId(event.target.value);
    setEditAppId(true);
  };
  const handleAppIdBlur = () => {
    if (editAppId) {
      dispatch(
        HandleServiceInformationActions.saveServiceConfig({
          url: `${window.location.origin}/designer/${org}/${app}/Config/SetServiceConfig`,
          newServiceDescription: newDescription,
          newServiceId: newId,
          newServiceName: newName,
        }),
      );
      setEditAppId(false);
    }
  };

  const render =
    repository && newName !== null && newDescription !== null && newId !== null;

  return (
    <div
      data-testid='administration-container'
      className={classes.root}
    >
      {render ? (
          <AltinnColumnLayout
            sideMenuChildren={
              <SideMenuContent
                initialCommit={initialCommit}
                language={language}
                service={repository}
              />
            }
            header={getLanguageFromKey('administration.administration', language)}
          >
            <MainContent
              appDescription={newDescription}
              appId={newId}
              appName={newName}
              appNameAnchorEl={appNameAnchorEl}
              editAppName={editAppName}
              language={language}
              onAppDescriptionBlur={handleAppDescriptionBlur}
              onAppDescriptionChange={handleAppDescriptionChange}
              onAppIdBlur={handleAppIdBlur}
              onAppIdChange={handleAppIdChange}
              onAppNameBlur={handleAppNameBlur}
              onAppNameChange={handleAppNameChange}
              onEditAppNameClick={handleEditAppNameClick}
              repository={repository}
            />
          </AltinnColumnLayout>
      ) : (
        <Grid container={true}>
          <AltinnSpinner
            spinnerText='Laster siden'
            styleObj={classes.spinner}
          />
        </Grid>
      )}
    </div>
  );
}

export const Administration = AdministrationComponent;
