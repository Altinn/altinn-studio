import * as React from 'react';
import { Route } from 'react-router-dom';
import FormFiller from './features/form/containers';
import Instantiate from './features/instantiate/containers';
import { ServiceInfo } from './features/serviceInfo/containers';

export default function() {
  return (
    <>
      <Route path={'/'} exact={true} component={ServiceInfo} />
      <Route path={'/instantiate'} exact={true} component={Instantiate} />
      <Route path={'/instance/:partyId/:instanceId'} component={FormFiller} />
    </>
  );
}
