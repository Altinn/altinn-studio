import React from 'react';
import { useNavigate } from 'react-router-dom';

import { GlobalData } from 'nextsrc/core/globalData';
import { InstanceApi } from 'nextsrc/features/instantiate/api';
import classes from 'nextsrc/features/instantiate/pages/instance-selection/InstanceSelectionPage.module.css';
import { instantiateRouteBuilders } from 'nextsrc/features/instantiate/routes';

export const InstanceSelectionPage = () => {
  const navigate = useNavigate();

  return (
    <div className={classes.container}>
      <h1>Instance selection</h1>

      <button
        onClick={async () => {
          const profile = GlobalData.userProfile;
          if (!profile) {
            throw new Error('no profile');
          }
          const newInstance = await InstanceApi.create(profile.partyId);
          const [instanceOwnerPartyId, instanceGuid] = newInstance.id.split('/');
          navigate(instantiateRouteBuilders.instance({ instanceOwnerPartyId, instanceGuid }));
        }}
      >
        New instance
      </button>
    </div>
  );
};
