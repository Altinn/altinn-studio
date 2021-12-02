import { makeStyles } from '@material-ui/core/styles';
import { Grid } from '@material-ui/core';
import * as React from 'react';
import { AxiosError } from 'axios';

import { useAppSelector } from 'app/hooks';

import AltinnButton from 'app-shared/components/AltinnButton';
import AltinnSpinner from 'app-shared/components/AltinnSpinner';
import { getLanguageFromKey } from 'app-shared/utils/language';
import { post } from 'app-shared/utils/networking';

import { ServiceOwnerSelector } from './ServiceOwnerSelector';
import { RepoNameInput } from './RepoNameInput';

import { validateRepoName } from 'common/utils';

const useStyles = makeStyles({
  button: {
    fontSize: '16px',
    padding: '5px 45px 5px 45px',
    height: '37px !Important',
  },
  marginBottom_24: {
    marginBottom: 24,
  },
  marginTop: {
    marginTop: 100,
  },
});

enum PageState {
  Idle = 'Idle',
  Creating = 'Creating',
}

export const CreateService = () => {
  const language = useAppSelector((state) => state.language.language);
  const classes = useStyles();

  const [selectedOrgOrUser, setSelectedOrgOrUser] = React.useState('');
  const [orgErrorMessage, setOrgErrorMessage] = React.useState(null);
  const [repoErrorMessage, setRepoErrorMessage] = React.useState(null);
  const [repoName, setRepoName] = React.useState('');
  const [pageState, setPageState] = React.useState(PageState.Idle);

  const handleServiceOwnerChanged = React.useCallback((newValue: string) => {
    setSelectedOrgOrUser(newValue);
    setOrgErrorMessage(null);
  }, []);

  const handleRepoNameChanged = React.useCallback((newValue: string) => {
    setRepoName(newValue);
    setRepoErrorMessage(null);
  }, []);

  const validateService = () => {
    let serviceIsValid = true;

    if (!selectedOrgOrUser) {
      setOrgErrorMessage(
        getLanguageFromKey('dashboard.field_cannot_be_empty', language),
      );
      serviceIsValid = false;
    }

    if (!repoName) {
      setRepoErrorMessage(
        getLanguageFromKey('dashboard.field_cannot_be_empty', language),
      );
      serviceIsValid = false;
    }

    if (repoName && !validateRepoName(repoName)) {
      setRepoErrorMessage(
        getLanguageFromKey(
          'dashboard.service_name_has_illegal_characters',
          language,
        ),
      );
      serviceIsValid = false;
    }

    if (repoName.length > 30) {
      setRepoErrorMessage(
        getLanguageFromKey('dashboard.service_name_is_too_long', language),
      );
      serviceIsValid = false;
    }
    return serviceIsValid;
  };

  const handleCreateService = () => {
    const serviceIsValid = validateService();

    if (serviceIsValid) {
      setPageState(PageState.Creating);

      const url = `${window.location.origin}/designerapi/Repository/CreateApp?org=${selectedOrgOrUser}&repository=${repoName}`;
      post(url)
        .then((result: any) => {
          window.location.assign(
            `${window.location.origin}/designer/${result.full_name}#/about`,
          );
        })
        .catch((error: AxiosError) => {
          if (error.response.status === 409) {
            setPageState(PageState.Idle);

            setRepoErrorMessage(
              getLanguageFromKey('dashboard.app_already_exist', language),
            );
          } else {
            console.error('Unsucessful creating new app', error);
            setPageState(PageState.Idle);

            setRepoErrorMessage(
              getLanguageFromKey('dashboard.error_when_creating_app', language),
            );
          }
        });
    }
  };

  return (
    <div className={classes.marginTop}>
      <Grid
        container={true}
        justifyContent='center'
        direction='row'
        className='block-with-text'
      >
        <Grid item={true} xs={10}>
          <div className={classes.marginBottom_24}>
            <ServiceOwnerSelector
              onServiceOwnerChanged={handleServiceOwnerChanged}
              errorMessage={orgErrorMessage}
              selectedOrgOrUser={selectedOrgOrUser}
            />
          </div>
          <div className={classes.marginBottom_24}>
            <RepoNameInput
              onRepoNameChanged={handleRepoNameChanged}
              repoName={repoName}
              errorMessage={repoErrorMessage}
            />
          </div>
          {pageState === PageState.Creating ? (
            <AltinnSpinner
              spinnerText={getLanguageFromKey(
                'dashboard.creating_your_service',
                language,
              )}
            />
          ) : (
            <AltinnButton
              btnText={getLanguageFromKey(
                'dashboard.create_service_btn',
                language,
              )}
              className={classes.button}
              onClickFunction={handleCreateService}
            />
          )}
        </Grid>
      </Grid>
    </div>
  );
};
