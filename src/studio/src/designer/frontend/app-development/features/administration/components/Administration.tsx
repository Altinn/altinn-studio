import { createTheme, Grid, makeStyles } from '@material-ui/core';
import * as React from 'react';
import AltinnColumnLayout from 'app-shared/components/AltinnColumnLayout';
import AltinnSpinner from 'app-shared/components/AltinnSpinner';
import altinnTheme from 'app-shared/theme/altinnStudioTheme';
import { getLanguageFromKey } from 'app-shared/utils/language';
import VersionControlHeader from 'app-shared/version-control/versionControlHeader';
import { HandleServiceInformationActions } from '../handleServiceInformationSlice';
import MainContent from './MainContent';
import SideMenuContent from './SideMenuContent';
import { useAppDispatch, useAppSelector } from 'common/hooks';

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
  const name = useAppSelector(state => state.serviceInformation.serviceNameObj.name);
  const description = useAppSelector(state => state.serviceInformation.serviceDescriptionObj.description);
  const id = useAppSelector(state => state.serviceInformation.serviceIdObj.serviceId);
  const language = useAppSelector(state => state.languageState.language);
  const service = useAppSelector(state => state.serviceInformation.repositoryInfo);
  const initialCommit = useAppSelector(state => state.serviceInformation.initialCommit);
  const classes = useStyles();
  const dispatch = useAppDispatch();

  const [newName, setNewName] = React.useState<string>(name);
  const [newDescription, setNewDescription] = React.useState<string>(description);
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

  const onServiceNameChanged = (event: any) => {
    setNewName(event.target.value);
    setAppNameAnchorEl(null);
  }

  const handleEditServiceName = () => {
    setEditAppName(true);
  }

  const onBlurAppName = () => {
    if (editAppName && !newName) {
      setAppNameAnchorEl(document.getElementById('administrationInputServicename'));
    } else {
      const { org, app } = window as Window as IAltinnWindow;
      dispatch(HandleServiceInformationActions.saveServiceName({
        url: `${window.location.origin}/designer/${org}/${app}/Text/SetServiceName`,
        newServiceName: newName,
      }));
      dispatch(HandleServiceInformationActions.saveServiceConfig({
        url: `${window.location.origin}/designer/${org}/${app}/Config/SetServiceConfig`,
        newServiceDescription: newDescription,
        newServiceId: newId,
        newServiceName: newName,
      }));
      setEditAppName(false);
    }
  }

  const onServiceDescriptionChanged = (event: any) => {
    setNewDescription(event.target.value);
    setEditAppDescription(true);
  }

  const onBlurAppDescription = () => {
    if (editAppDescription) {
      const { org, app } = window as Window as IAltinnWindow;
      dispatch(HandleServiceInformationActions.saveServiceConfig({
        url: `${window.location.origin}/designer/${org}/${app}/Config/SetServiceConfig`,
        newServiceDescription: newDescription,
        newServiceId: newId,
        newServiceName: newName,
      }));
      setEditAppDescription(false);
    }
  }

  const onAppIdChanged = (event: any) => {
    setNewId(event.target.value);
    setEditAppId(true);
  }

  const onBlurAppId = () => {
    if (editAppId) {
      const { org, app } = window as Window as IAltinnWindow;
      dispatch(HandleServiceInformationActions.saveServiceConfig({
        url: `${window.location.origin}/designer/${org}/${app}/Config/SetServiceConfig`,
        newServiceDescription: newDescription,
        newServiceId: newId,
        newServiceName: newName,
      }));
      setEditAppId(false);
    }
  }

  const render = service &&
    newName !== null &&
    newDescription !== null &&
    newId !== null;

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
              service={service}
            />
          }
          header={getLanguageFromKey('administration.administration', language)}
        >
          <MainContent
            editServiceName={editAppName}
            handleEditServiceName={handleEditServiceName}
            language={language}
            onBlurServiceDescription={onBlurAppDescription}
            onBlurServiceId={onBlurAppId}
            onBlurServiceName={onBlurAppName}
            onServiceDescriptionChanged={onServiceDescriptionChanged}
            onServiceIdChanged={onAppIdChanged}
            onServiceNameChanged={onServiceNameChanged}
            service={service}
            serviceDescription={newDescription}
            serviceId={newId}
            serviceName={newName}
            serviceNameAnchorEl={appNameAnchorEl}
          />
        </AltinnColumnLayout>
      ) :
        <Grid container={true}>
          <AltinnSpinner spinnerText='Laster siden' styleObj={classes.spinnerLocation} />
        </Grid>
      }
    </div>
  );
}

export const Administration = AdministrationComponent;
