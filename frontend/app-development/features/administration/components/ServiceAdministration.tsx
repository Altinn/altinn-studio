import React, { useEffect, useState } from 'react';
import type { Repository } from 'app-shared/types/Repository';
import { StudioPageSpinner } from '@studio/components';
import { HandleServiceInformationActions } from '../handleServiceInformationSlice';
import { MainContent } from './MainContent';
import { serviceConfigPath } from 'app-shared/api/paths';
import { useAppDispatch, useAppSelector } from '../../../hooks';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';

export interface ServiceAdministrationProps {
  repository: Repository;
}

export function ServiceAdministration({ repository }: ServiceAdministrationProps) {
  const { org, app } = useStudioUrlParams();
  const name = useAppSelector((state) => state.serviceInformation.serviceNameObj.name);
  const description = useAppSelector(
    (state) => state.serviceInformation.serviceDescriptionObj.description,
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
        HandleServiceInformationActions.saveServiceConfig({
          url: serviceConfigPath(org, app),
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

  const handleAppDescriptionBlur = () => {
    if (editAppDescription) {
      dispatch(
        HandleServiceInformationActions.saveServiceConfig({
          url: serviceConfigPath(org, app),
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
          url: serviceConfigPath(org, app),
          newServiceDescription: newDescription,
          newServiceId: newId,
          newServiceName: newName,
        }),
      );
      setEditAppId(false);
    }
  };

  const render = repository && newName !== null && newDescription !== null && newId !== null;

  return (
    <div>
      {render ? (
        <MainContent
          appDescription={newDescription}
          appId={newId}
          appName={newName}
          appNameAnchorEl={appNameAnchorEl}
          editAppName={editAppName}
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
        <StudioPageSpinner />
      )}
    </div>
  );
}
