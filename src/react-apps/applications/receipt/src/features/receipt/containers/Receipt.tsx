import { createStyles, WithStyles, withStyles } from '@material-ui/core';
import * as React from 'react';
import ContentLoader from 'react-content-loader';
import AltinnAppHeader from '../../../../../shared/src/components/AltinnAppHeader';
import AltinnModal from '../../../../../shared/src/components/AltinnModal';
import { IProfile } from '../../../../../shared/src/types';
import { getLanguageFromKey } from '../../../../../shared/src/utils/language';
import { IInstance } from '../../../types';
import { altinnUrl, getInstanceMetadataUrl, getProfileUrl, getUrlQueryParameterByKey } from '../../../utils/urlHelper';

const styles = () => createStyles({
  modal: {
    boxShadow: null,
    MozBoxShadow: null,
    WebkitBoxShadow: null,
  },
  body: {
    padding: 0,
  },
});

function Receipt(props: WithStyles<typeof styles>) {

  const [profile, setProfile] = React.useState<IProfile>(null);
  const [instance, setInstance] = React.useState<IInstance>(null);
  const [error, setError] = React.useState(null);

  const fetchProfile = async () => {
    fetch(getProfileUrl())
    .then((response: Response) => {
      return response.json() as Promise<IProfile>;
    })
    .then((profileResponse: IProfile) => {
      setProfile(profileResponse);
    })
    .catch((err: Error) => {
      setError(err);
      console.error(err);
    });
  };

  const fetchInstance = async () => {
    if (window.location) {
      setInstance({} as IInstance);
      return;
    }
    fetch(getInstanceMetadataUrl()).then((response: Response) => {
      if (!response.ok) {
        throw new Error('Get instance metadata responded with status: ' + response.status);
      }
      return response.json() as Promise<IInstance>;
    })
    .then((instanceMetadata: IInstance) => {
      setInstance(instanceMetadata);
    })
    .catch((err: Error) => {
      console.error(err);
      setError(err);
    });
  };

  const handleModalClose = () => {
    const urlQueryKey = 'goToUrl';
    let url = getUrlQueryParameterByKey(urlQueryKey);
    if (!url) {
      url = altinnUrl;
    }
    window.location.href = url;
  };

  const renderLoader = (): JSX.Element => {
    return(
      <AltinnModal
        classes={props.classes}
        isOpen={true}
        hideBackdrop={true}
        onClose={handleModalClose}
        hideCloseIcon={false}
        headerText={getLanguageFromKey('Kvittering', {})}
      >
        <ContentLoader
          height={200}
        >
          <rect x='25' y='20' rx='0' ry='0' width='100' height='5' />
          <rect x='25' y='30' rx='0' ry='0' width='350' height='5' />
          <rect x='25' y='40' rx='0' ry='0' width='350' height='25' />

          <rect x='25' y='75' rx='0' ry='0' width='100' height='5' />
          <rect x='25' y='85' rx='0' ry='0' width='350' height='5' />
          <rect x='25' y='95' rx='0' ry='0' width='350' height='25' />

          <rect x='25' y='130' rx='0' ry='0' width='100' height='5' />
          <rect x='25' y='140' rx='0' ry='0' width='350' height='5' />
          <rect x='25' y='150' rx='0' ry='0' width='350' height='25' />
        </ContentLoader>
      </AltinnModal>
    );
  };

  const renderContent = (): JSX.Element => {
    return(
      <AltinnModal
        classes={props.classes}
        isOpen={true}
        onClose={handleModalClose}
        hideBackdrop={true}
        hideCloseIcon={false}
        headerText={getLanguageFromKey('Kvittering', {})}
      >
        <div>This is the content. Error: {error}</div>
      </AltinnModal>
    );
  };

  const isLoading = (): boolean => {
    return (profile === null || instance === null);
  };

  React.useEffect(() => {
    fetchInstance();
    fetchProfile();
  }, []);

  return (
    <>
      <AltinnAppHeader language={{}} profile={profile} />
      {isLoading() && renderLoader()}
      {!isLoading() && renderContent()}
    </>
  );
}

export default withStyles(styles)(Receipt);
