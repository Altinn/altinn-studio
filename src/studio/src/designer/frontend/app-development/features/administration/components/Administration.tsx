import React from 'react';
import { createTheme, Grid } from '@mui/material';
import { makeStyles } from '@mui/styles';
import AltinnColumnLayout from 'app-shared/components/AltinnColumnLayout';
import AltinnSpinner from 'app-shared/components/AltinnSpinner';
import altinnTheme from 'app-shared/theme/altinnStudioTheme';
import { getLanguageFromKey } from 'app-shared/utils/language';
import VersionControlHeader from 'app-shared/version-control/versionControlHeader';
import { HandleServiceInformationActions } from '../handleServiceInformationSlice';
import MainContent from './MainContent';
import SideMenuContent from './SideMenuContent';
import { useAppDispatch, useAppSelector } from 'common/hooks';
import type { IAltinnWindow } from '../../../types/global';

const theme = createTheme(altinnTheme);
const useStyles = makeStyles({
  avatar: {
    maxHeight: '2em',
  },
  sidebarHeader: {
    marginBottom: 20,
    fontSize: 20,
    fontWeight: 500,
  },
  sidebarHeaderSecond: {
    marginTop: 36,
  },
  sidebarInfoText: {
    fontSize: 16,
    marginBottom: 12,
  },
  iconStyling: {
    fontSize: 35,
    textAlign: 'right',
  },
  sidebarServiceOwner: {
    marginTop: 10,
  },
  sidebarCreatedBy: {
    fontSize: 16,
    marginTop: 10,
  },
  spinnerLocation: {
    margin: 'auto',
  },
  marginBottom_24: {
    marginBottom: 24,
  },
  versionControlHeaderMargin: {
    marginLeft: 60,
  },
  [theme.breakpoints.up('md')]: {
    versionControlHeaderMargin: {
      marginLeft: theme.sharedStyles.leftDrawerMenuClosedWidth + 60,
    },
  },
});

export function AdministrationComponent() {
  const name = useAppSelector(
    (state) => state.serviceInformation.serviceNameObj.name,
  );
  const description = useAppSelector(
    (state) => state.serviceInformation.serviceDescriptionObj.description,
  );
  const id = useAppSelector(
    (state) => state.serviceInformation.serviceIdObj.serviceId,
  );
  const language = useAppSelector((state) => state.languageState.language);
  const repository = useAppSelector(
    (state) => state.serviceInformation.repositoryInfo,
  );
  const initialCommit = useAppSelector(
    (state) => state.serviceInformation.initialCommit,
  );
  const classes = useStyles();
  const dispatch = useAppDispatch();

  const [newName, setNewName] = React.useState<string>(name);
  const [newDescription, setNewDescription] =
    React.useState<string>(description);
  const [newId, setNewId] = React.useState<string>(id);
  const [editAppName, setEditAppName] = React.useState<boolean>();
  const [editAppDescription, setEditAppDescription] = React.useState<boolean>();
  const [editAppId, setEditAppId] = React.useState<boolean>();
  const [appNameAnchorEl, setAppNameAnchorEl] = React.useState<HTMLElement>();

  React.useEffect(() => {
    setNewName(name);
  }, [name]);

  React.useEffect(() => {
    setNewDescription(description);
  }, [description]);

  React.useEffect(() => {
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
      const { org, app } = window as Window as IAltinnWindow;
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

  const handleAppDescriptionBlur = () => {
    if (editAppDescription) {
      const { org, app } = window as Window as IAltinnWindow;
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
      const { org, app } = window as Window as IAltinnWindow;
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
    <div data-testid='administration-container'>
      {render ? (
        <AltinnColumnLayout
          aboveColumnChildren={
            <div className={classes.versionControlHeaderMargin}>
              <VersionControlHeader language={language} />
            </div>
          }
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
            styleObj={classes.spinnerLocation}
          />
        </Grid>
      )}
    </div>
  );
}

export const Administration = AdministrationComponent;
