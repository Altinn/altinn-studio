import * as React from 'react';
import { Redirect } from 'react-router-dom';
import { AltinnSpinner } from '../../../../../shared/src/components/AltinnSpinner';
import { post } from '../../../utils/networking';
import { IAltinnWindow } from 'src/types';

export default function () {
  const [instantiated, setInstatsiated] = React.useState(false);

  // TODO:
  // 1 - Check if user has a reportee selected.
  // 2 - Create an instance and get instanceId
  // 3 - Redirect to /instance/${instanceId}

  const createNewInstance = () => {
    const [] = window.location.split('/');
    const { org, service, reportee } = window as IAltinnWindow;
    const formData: FormData = new FormData();
    formData.append('ReporteeID', reportee);
    formData.append('Org', org);
    formData.append('Service', service);

    post('')
  }

  React.useEffect(() => {

    // setInstatsiated(true);
  }, []);

  if (instantiated) {
    return (
      <Redirect to={'/instance/wooh'} />
    );
  } else {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          alignContent: 'center',
          alignItems: 'center',
        }}
      >
        <AltinnSpinner classes={'test'} />
      </div>
    );
  }
}
