import * as React from 'react';
import { Route } from 'react-router-dom';
import FormFiller from './features/form/containers';
import Header from './features/header/containers';
import Instantiate from './features/instantiate/containers';
import ServiceInfo from './features/serviceInfo/containers';

export default function() {
  return (
    <>
      <Header />
      <Route path={'/'} exact={true} component={ServiceInfo} />
      <Route path={'/new'} exact={true} component={Instantiate} />
      <Route path={'/instance/:instanceId'} component={FormFiller} />
    </>
  );
}
