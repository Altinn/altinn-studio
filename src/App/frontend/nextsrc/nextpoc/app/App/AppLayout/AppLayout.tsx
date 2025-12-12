import React from 'react';
import { Navigate, Outlet, useLoaderData, useParams } from 'react-router-dom';

import classes from 'nextsrc/nextpoc/app/App/AppLayout/AppLayout.module.css';
import { Header } from 'nextsrc/nextpoc/components/Header';
import { initialStateStore } from 'nextsrc/nextpoc/stores/settingsStore';
import { useStore } from 'zustand/index';

export interface LoaderData {
  instanceId: string;
}

export const AppLayout = () => {
  const params = useParams();
  const { validParties } = useStore(initialStateStore);
  const currentParty = validParties[0];

  const { instanceId } = useLoaderData() as LoaderData;
  if (!instanceId) {
    throw new Error('no instance ID');
  }

  if (!currentParty) {
    throw new Error('No valid parties');
  }
  return (
    <div className={classes.container}>
      <Header />
      {!params.instanceGuid && instanceId && <Navigate to={`instance/${instanceId}`} />}
      <main className={classes.mainContent}>
        <section
          id='main-content'
          className={classes.mainSection}
          tabIndex={-1}
        >
          <div className={classes.contentPadding}>
            <Outlet />
          </div>
        </section>
      </main>
    </div>
  );
};
