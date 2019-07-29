import * as React from 'react';
import { Route } from 'react-router-dom';
import FormFiller from './features/form/containers';
import Instantiate from './features/instantiate/containers';
import PartySelection from './features/instantiate/containers/PartySelection';
import { ServiceInfo } from './features/serviceInfo/containers';
import StatefullAltinnError from './shared/container/StatefullAltinnError';

export default function() {
  return (
    <>
      <Route path={'/'} exact={true} component={ServiceInfo} />
      <Route path={'/instantiate'} exact={true} component={Instantiate} />
      <Route path={'/partyselection'} component={PartySelection} />
      <Route path={'/instance/:partyId/:instanceGuid'} component={FormFiller} />
      <Route path={'/error'} component={StatefullAltinnError} />
    </>
  );
}
