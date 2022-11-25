import React, { useEffect, useState } from 'react';
import AltinnSpinner from 'app-shared/components/AltinnSpinner';
import { HandleServiceInformationActions } from '../handleServiceInformationSlice';
import { MainContent } from './MainContent';
import { useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../common/hooks';
import type { IRepository } from '../../../types/global';
import classes from './Administration.module.css';
import { setServiceConfigPath, setServiceNamePath } from 'app-shared/api-paths';

export interface ServiceAdministrationProps {
  language: any;
  repository: IRepository;
}

export function ServiceAdministration({ language, repository }: ServiceAdministrationProps) {
  const { org, app } = useParams();
  const name = useAppSelector((state) => state.serviceInformation.serviceNameObj.name);
  const description = useAppSelector(
    (state) => state.serviceInformation.serviceDescriptionObj.description
  );
  const id = useAppSelector((state) => state.serviceInformation.serviceIdObj.serviceId);
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

  const handleEditAppNameClick = () => setEditAppName(true);

  const handleAppNameBlur = () => {
    if (editAppName && !newName) {
      setAppNameAnchorEl(document.getElementById('administrationInputAppName'));
    } else {
      dispatch(
        HandleServiceInformationActions.saveServiceName({
          url: setServiceNamePath(org, app),
          newServiceName: newName,
        })
      );
      dispatch(
        HandleServiceInformationActions.saveServiceConfig({
          url: setServiceConfigPath(org, app),
          newServiceDescription: newDescription,
          newServiceId: newId,
          newServiceName: newName,
        })
      );
      setEditAppName(false);
    }
  };

  const handleAppDescriptionChange = (event: any) => {
    setNewDescription(event.target.value);
    setEditAppDescription(true);
  };

  const handleAppDescriptionBlur = () => {
    if (editAppDescription) {
      dispatch(
        HandleServiceInformationActions.saveServiceConfig({
          url: setServiceConfigPath(org, app),
          newServiceDescription: newDescription,
          newServiceId: newId,
          newServiceName: newName,
        })
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
          url: setServiceConfigPath(org, app),
          newServiceDescription: newDescription,
          newServiceId: newId,
          newServiceName: newName,
        })
      );
      setEditAppId(false);
    }
  };

  const render = repository && newName !== null && newDescription !== null && newId !== null;

  return (
    <div data-testid='service-administration-container' className={classes.root}>
      {render ? (
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
          repositoryName={repository?.name || ''}
        />
      ) : (
        <div>
          <AltinnSpinner spinnerText='Laster siden' styleObj={classes.spinner} />
        </div>
      )}
    </div>
  );
}
