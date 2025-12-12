import React from 'react';
import { Navigate, Outlet, useLoaderData, useParams } from 'react-router-dom';

import { API_CLIENT, APP, ORG } from 'nextsrc/nextpoc/app/App/App';
import { Header } from 'nextsrc/nextpoc/components/Header';
import { layoutStore } from 'nextsrc/nextpoc/stores/layoutStore';
import { initialStateStore } from 'nextsrc/nextpoc/stores/settingsStore';
import { textResourceStore } from 'nextsrc/nextpoc/stores/textResourceStore';
import { useStore } from 'zustand/index';

// @ts-ignore
const xsrfCookie = document.cookie
  .split('; ')
  .find((row) => row.startsWith('XSRF-TOKEN='))
  .split('=')[1];
const headers = { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': xsrfCookie };

export interface LoaderData {
  instanceId: string;
}

export async function initialLoader() {
  const { user, validParties } = initialStateStore.getState();

  const { layoutSetsConfig } = layoutStore.getState();

  const currentParty = validParties[0];
  if (!currentParty) {
    throw new Error('No valid parties');
  }

  const res = await API_CLIENT.org.activeDetail(ORG, APP, currentParty.partyId);

  const instances = await res.json();
  let instanceId = '';

  if (instances.length > 0) {
    instanceId = instances[0].id;
  } else {
    const res = await API_CLIENT.org.instancesCreate(
      ORG,
      APP,
      {
        instanceOwnerPartyId: currentParty.partyId,
      },
      {
        headers,
      },
    );
    const data = await res.json();

    instanceId = data.id;
  }

  if (!layoutSetsConfig) {
    const res = await API_CLIENT.org.layoutsetsDetail(ORG, APP);
    const data = await res.json();
    layoutStore.getState().setLayoutSets(data);
  }

  // if (user.profileSettingPreference.language) {
  const langRes = await API_CLIENT.org.v1TextsDetail(ORG, APP, user.profileSettingPreference.language ?? 'nb');
  const data = await langRes.json();

  console.log(JSON.stringify(data, null, 2));

  console.log('text');

  textResourceStore.setState({ textResource: data });
  // }

  return { instanceId };
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
    <div>
      <Header />
      {!params.instanceGuid && instanceId && <Navigate to={`instance/${instanceId}`} />}
      <Outlet />
    </div>
  );
};
