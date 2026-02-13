import React from 'react';
import { useNavigate } from 'react-router-dom';

import { useMutation } from '@tanstack/react-query';
import { InstanceApi } from 'nextsrc/core/apiClient/instanceApi';
import { GlobalData } from 'nextsrc/core/globalData';
import classes from 'nextsrc/features/instantiate/pages/instance-selection/InstanceSelectionPage.module.css';
import { routeBuilders } from 'nextsrc/routesBuilder';

export const InstanceSelectionPage = () => {
  const navigate = useNavigate();

  const createInstance = useMutation({
    mutationFn: async () => {
      const profile = GlobalData.userProfile;
      if (!profile) {
        throw new Error('no profile');
      }
      return InstanceApi.create(profile.partyId);
    },
    onSuccess: (newInstance) => {
      const [instanceOwnerPartyId, instanceGuid] = newInstance.id.split('/');

      if (!newInstance.process.currentTask?.elementId) {
        throw new Error('no current task element ID. Handle it.');
      }

      navigate(
        routeBuilders.task({
          instanceOwnerPartyId,
          instanceGuid,
          taskId: newInstance.process.currentTask.elementId,
        }),
      );
    },
  });

  return (
    <div className={classes.container}>
      <h1>Instance selection</h1>

      {createInstance.error && <p>Failed to create instance: {createInstance.error.message}</p>}

      <button
        onClick={() => createInstance.mutate()}
        disabled={createInstance.isPending}
      >
        {createInstance.isPending ? 'Creating...' : 'New instance'}
      </button>
    </div>
  );
};
