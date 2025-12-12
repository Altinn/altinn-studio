import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import type { LoaderFunctionArgs } from 'react-router-dom';

import { API_CLIENT, APP, ORG } from 'nextsrc/nextpoc/app/App/App';
import { instanceStore } from 'nextsrc/nextpoc/stores/instanceStore';
import { layoutStore } from 'nextsrc/nextpoc/stores/layoutStore';
import { initialStateStore } from 'nextsrc/nextpoc/stores/settingsStore';
import { useStore } from 'zustand';

type InstanceParams = {
  partyId: string;
  instanceGuid: string;
};

export async function instanceLoader({ params }: LoaderFunctionArgs<InstanceParams>) {
  const { partyId, instanceGuid } = params;
  const { instance } = instanceStore.getState();

  let localInstance = instance;
  if (!partyId || !instanceGuid) {
    throw new Error('missing url params');
  }
  const { validParties } = initialStateStore.getState();

  const currentParty = validParties[0];
  if (!currentParty) {
    throw new Error('No valid parties');
  }

  if (!instance) {
    const res = await API_CLIENT.org.instancesDetail(ORG, APP, parseInt(partyId), instanceGuid); //fetch('/api/users');
    const instance = await res.json();
    instanceStore.setState({ instance });
    localInstance = instance;
  }

  if (!localInstance) {
    throw new Error('No instance');
  }

  const res = await API_CLIENT.org.dataDetail(
    ORG,
    APP,
    Number.parseInt(partyId),
    instanceGuid,
    localInstance.data[0].id,
  );
  const data = await res.json();
  layoutStore.getState().setDataObject(data);
  return {};
}

export const Instance = () => {
  const { instance } = useStore(instanceStore); //instanceStore.getState();
  return (
    <div>
      {instance?.process.currentTask.elementId && <Navigate to={`${instance?.process.currentTask.elementId}`} />}
      <Outlet />
    </div>
  );
};
